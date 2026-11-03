import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTBankToken } from "@/lib/payments/tbank";

export const runtime = "nodejs";

function reply(message: string, status = 200) {
  return new NextResponse(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizePaymentId(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 && normalized.length <= 100
      ? normalized
      : null;
  }

  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }

  return null;
}

export async function POST(req: Request) {
  const password = process.env.TBANK_PASSWORD;
  const terminalKey = process.env.TBANK_TERMINAL_KEY;

  if (!password || !terminalKey) {
    return reply("Configuration error", 503);
  }

  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return reply("Invalid JSON", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply("Invalid request", 400);
    }

    const notification = body as Record<string, unknown>;

    if (!verifyTBankToken(notification, password)) {
      return reply("Invalid token", 403);
    }

    const orderId = notification.OrderId;
    const amount = notification.Amount;
    const paymentId = normalizePaymentId(notification.PaymentId);
    const status =
      typeof notification.Status === "string"
        ? notification.Status
        : "UNKNOWN";

    if (
      notification.TerminalKey !== terminalKey ||
      typeof orderId !== "string" ||
      orderId.length === 0 ||
      orderId.length > 100 ||
      typeof amount !== "number" ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      !paymentId
    ) {
      return reply("Payment mismatch", 400);
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: {
        id: true,
        userId: true,
        amount: true,
        providerId: true,
        creditedAt: true,
      },
    });

    if (!payment) {
      return reply("Unknown order", 404);
    }

    if (amount !== payment.amount) {
      return reply("Payment mismatch", 400);
    }

    if (payment.providerId && payment.providerId !== paymentId) {
      console.error("T-Bank PaymentId mismatch", { orderId });
      return reply("Payment mismatch", 400);
    }

    if (notification.Success === true && status === "CONFIRMED") {
      await prisma.$transaction(async (tx) => {
        const now = new Date();

        const updated = await tx.payment.updateMany({
          where: {
            id: payment.id,
            creditedAt: null,
            amount: payment.amount,
            OR: [
              { providerId: null },
              { providerId: paymentId },
            ],
          },
          data: {
            status: "CONFIRMED",
            creditedAt: now,
            providerId: paymentId,
          },
        });

        // Повторное уведомление не зачисляет деньги второй раз.
        if (updated.count !== 1) {
          return;
        }

        const rubles = payment.amount / 100;

        await tx.user.update({
          where: { id: payment.userId },
          data: {
            monthlyLimit: { increment: rubles },
          },
        });

        await tx.transaction.create({
          data: {
            userId: payment.userId,
            amount: rubles,
            type: "tbank_topup",
            description: `Пополнение через Т-Банк, платёж ${paymentId}`,
          },
        });
      });

      return reply("OK");
    }

    // Не подтверждённые платежи не зачисляются.
    // После зачисления статус не перезаписывается.
    await prisma.payment.updateMany({
      where: {
        id: payment.id,
        creditedAt: null,
        OR: [
          { providerId: null },
          { providerId: paymentId },
        ],
      },
      data: {
        status,
        providerId: paymentId,
      },
    });

    return reply("OK");
  } catch (error) {
    console.error("Ошибка уведомления Т-Банк:", error);
    return reply("Processing error", 500);
  }
}