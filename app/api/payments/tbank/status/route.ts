import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createTBankToken } from "@/lib/payments/tbank";

export const runtime = "nodejs";

const TBANK_STATE_URL = "https://securepay.tinkoff.ru/v2/GetState";

type TBankState = {
  Success?: unknown;
  Status?: unknown;
  Amount?: unknown;
  PaymentId?: unknown;
  ErrorCode?: unknown;
};

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 }
    );
  }

  const orderId = new URL(req.url).searchParams.get("orderId");

  if (!orderId || orderId.length > 100) {
    return NextResponse.json(
      { error: "Некорректный номер заказа" },
      { status: 400 }
    );
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        userId: session.user.id,
      },
      select: {
        id: true,
        userId: true,
        orderId: true,
        amount: true,
        status: true,
        creditedAt: true,
        providerId: true,
        createdAt: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Платёж не найден" },
        { status: 404 }
      );
    }

    const terminalKey = process.env.TBANK_TERMINAL_KEY;
    const password = process.env.TBANK_PASSWORD;

    if (
      terminalKey &&
      password &&
      payment.providerId &&
      !payment.creditedAt
    ) {
      try {
        const fields = {
          TerminalKey: terminalKey,
          PaymentId: payment.providerId,
        };

        const response = await fetch(TBANK_STATE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...fields,
            Token: createTBankToken(fields, password),
          }),
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        });

        if (response.ok) {
          const state = (await response.json()) as TBankState;

          const statePaymentId =
            typeof state.PaymentId === "string" ||
            typeof state.PaymentId === "number"
              ? String(state.PaymentId)
              : null;

          const amountMatches =
            typeof state.Amount === "number" &&
            Number.isSafeInteger(state.Amount) &&
            state.Amount === payment.amount;

          const paymentIdMatches =
            statePaymentId === payment.providerId;

          if (
            state.Success === true &&
            state.Status === "CONFIRMED" &&
            amountMatches &&
            paymentIdMatches
          ) {
            await prisma.$transaction(async (tx) => {
              const now = new Date();

              const updated = await tx.payment.updateMany({
                where: {
                  id: payment.id,
                  userId: session.user.id,
                  creditedAt: null,
                  providerId: payment.providerId,
                  amount: payment.amount,
                },
                data: {
                  status: "CONFIRMED",
                  creditedAt: now,
                },
              });

              // Если уведомление банка уже зачислило платёж,
              // второй раз баланс не увеличиваем.
              if (updated.count !== 1) {
                return;
              }

              const rubles = payment.amount / 100;

              await tx.user.update({
                where: {
                  id: payment.userId,
                },
                data: {
                  monthlyLimit: {
                    increment: rubles,
                  },
                },
              });

              await tx.transaction.create({
                data: {
                  userId: payment.userId,
                  amount: rubles,
                  type: "tbank_topup",
                  description:
                    `Пополнение через Т-Банк, платёж ${payment.providerId}`,
                },
              });
            });
          }
        }
      } catch (error) {
        // Временная ошибка банка не меняет локальный статус.
        console.error(
          "Не удалось обновить статус платежа через Т-Банк:",
          error
        );
      }
    }

    const refreshed = await prisma.payment.findFirst({
      where: {
        id: payment.id,
        userId: session.user.id,
      },
      select: {
        orderId: true,
        amount: true,
        status: true,
        creditedAt: true,
        createdAt: true,
      },
    });

    if (!refreshed) {
      return NextResponse.json(
        { error: "Платёж не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...refreshed,
      amount: refreshed.amount / 100,
    });
  } catch (error) {
    console.error("Ошибка получения статуса платежа:", error);

    return NextResponse.json(
      { error: "Не удалось получить статус платежа" },
      { status: 500 }
    );
  }
}