// app/api/payments/tbank/notification/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTBankToken } from "@/lib/payments/tbank";

export const runtime = "nodejs";

function reply(message: string, status = 200) {
  return new NextResponse(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const password = process.env.TBANK_PASSWORD;
  const terminalKey = process.env.TBANK_TERMINAL_KEY;
  if (!password || !terminalKey) return reply("Configuration error", 503);

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") return reply("Invalid request", 400);
    const notification = body as Record<string, unknown>;

    if (!verifyTBankToken(notification, password)) return reply("Invalid token", 403);

    const orderId = notification.OrderId;
    const amount = notification.Amount;
    const paymentId = notification.PaymentId;
    const status = typeof notification.Status === "string" ? notification.Status : "UNKNOWN";

    if (typeof orderId !== "string" || typeof amount !== "number" || !paymentId) {
      return reply("Payment mismatch", 400);
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: { id: true, userId: true, amount: true, creditedAt: true },
    });
    if (!payment || payment.amount !== amount) return reply("Payment mismatch", 400);

    if (notification.Success === true && status === "CONFIRMED" && !payment.creditedAt) {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.payment.updateMany({
          where: { id: payment.id, creditedAt: null },
          data: { status: "CONFIRMED", creditedAt: new Date() },
        });
        if (updated.count !== 1) return;

        const rubles = payment.amount / 100;
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            monthlyLimit: { increment: rubles },
            accessExpiresAt: null, // <--- СБРОС ТАЙМЕРА ПОСЛЕ ОПЛАТЫ
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

    return reply("OK");
  } catch (error) {
    return reply("Processing error", 500);
  }
}