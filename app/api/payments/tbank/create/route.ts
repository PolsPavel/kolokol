import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createTBankToken } from "@/lib/payments/tbank";

export const runtime = "nodejs";

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 100_000;
const TBANK_INIT_URL = "https://securepay.tinkoff.ru/v2/Init";

function getBaseUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";

    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost))
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 }
    );
  }

  const terminalKey = process.env.TBANK_TERMINAL_KEY;
  const password = process.env.TBANK_PASSWORD;
  const configuredBaseUrl = process.env.NEXTAUTH_URL;

  if (!terminalKey || !password || !configuredBaseUrl) {
    return NextResponse.json(
      { error: "Т-Банк не настроен на сервере" },
      { status: 503 }
    );
  }

  const baseUrl = getBaseUrl(configuredBaseUrl);

  if (!baseUrl) {
    console.error("Некорректный NEXTAUTH_URL");
    return NextResponse.json(
      { error: "Некорректная настройка адреса сайта" },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректный JSON" },
      { status: 400 }
    );
  }

  const amount =
    body && typeof body === "object" && "amount" in body
      ? (body as { amount?: unknown }).amount
      : undefined;

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < MIN_AMOUNT ||
    amount > MAX_AMOUNT ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8
  ) {
    return NextResponse.json(
      {
        error: "Сумма пополнения должна быть от 100 до 100 000 ₽ с точностью до копеек",
      },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        isDeleted: true,
        phone: true,
        phoneVerifiedAt: true,
      },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    if (
      user.role !== "ADMIN" &&
      (!user.phone || !user.phoneVerifiedAt)
    ) {
      return NextResponse.json(
        { error: "Перед пополнением подтвердите номер телефона по SMS" },
        { status: 403 }
      );
    }

    const orderId = `kolokol-${randomUUID()}`;
    const amountKopecks = Math.round(amount * 100);

    // Сначала регистрируем заказ в БД.
    // Уведомление банка сможет обработать платёж даже при сбое ответа Init.
    await prisma.payment.create({
      data: {
        userId: user.id,
        provider: "tbank",
        orderId,
        amount: amountKopecks,
        currency: "RUB",
        status: "PENDING",
      },
    });

    const fields = {
      TerminalKey: terminalKey,
      Amount: amountKopecks,
      OrderId: orderId,
      Description: `Пополнение баланса KoloKol: ${amount.toFixed(2)} RUB`,
      NotificationURL: new URL(
        "/api/payments/tbank/notification",
        baseUrl
      ).toString(),
      SuccessURL: new URL(
        "/dashboard/analytics?payment=success",
        baseUrl
      ).toString(),
      FailURL: new URL(
        "/dashboard/analytics?payment=failed",
        baseUrl
      ).toString(),
    };

    let response: Response;

    try {
      response = await fetch(TBANK_INIT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...fields,
          Token: createTBankToken(fields, password),
        }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (error) {
      // Не переводим заказ в FAILED:
      // банк мог принять запрос, несмотря на сетевую ошибку.
      console.error("Неопределённый результат T-Bank Init:", error);

      return NextResponse.json(
        {
          error: "Не удалось получить ответ банка. Статус платежа уточняется.",
          orderId,
        },
        { status: 502 }
      );
    }

    let result: {
      Success?: boolean;
      PaymentURL?: string;
      PaymentId?: string | number;
      ErrorCode?: string;
      Message?: string;
    };

    try {
      result = await response.json();
    } catch {
      console.error("T-Bank Init вернул некорректный JSON", {
        status: response.status,
        orderId,
      });

      return NextResponse.json(
        {
          error: "Банк вернул некорректный ответ. Статус платежа уточняется.",
          orderId,
        },
        { status: 502 }
      );
    }

    if (result.Success !== true) {
      // Отказ банка — определённый результат.
      await prisma.payment.update({
        where: { orderId },
        data: {
          status: "FAILED",
        },
      });

      console.error("T-Bank Init failed", {
        status: response.status,
        errorCode: result.ErrorCode,
        orderId,
      });

      return NextResponse.json(
        { error: "Банк не смог создать платёж. Попробуйте позже." },
        { status: 502 }
      );
    }

    if (
      !response.ok ||
      !result.PaymentId ||
      typeof result.PaymentURL !== "string"
    ) {
      // Неизвестный результат не считаем отказом.
      return NextResponse.json(
        {
          error: "Банк вернул неполные данные. Статус платежа уточняется.",
          orderId,
        },
        { status: 502 }
      );
    }

    let paymentUrl: URL;

    try {
      paymentUrl = new URL(result.PaymentURL);
    } catch {
      console.error("T-Bank вернул некорректный PaymentURL", { orderId });

      return NextResponse.json(
        {
          error: "Банк вернул некорректную ссылку на оплату.",
          orderId,
        },
        { status: 502 }
      );
    }

    if (paymentUrl.protocol !== "https:") {
      console.error("T-Bank вернул небезопасный PaymentURL", { orderId });

      return NextResponse.json(
        {
          error: "Банк вернул небезопасную ссылку на оплату.",
          orderId,
        },
        { status: 502 }
      );
    }

    await prisma.payment.update({
      where: { orderId },
      data: {
        providerId: String(result.PaymentId),
        paymentUrl: paymentUrl.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      paymentUrl: paymentUrl.toString(),
      orderId,
    });
  } catch (error) {
    console.error("Ошибка создания платежа Т-Банк:", error);

    return NextResponse.json(
      { error: "Не удалось создать платёж" },
      { status: 500 }
    );
  }
}