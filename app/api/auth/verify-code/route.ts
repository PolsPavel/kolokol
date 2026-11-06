import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeE164Phone } from "@/lib/phone";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;

function hashCode(userId: string, phone: string, code: string): Buffer {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  }

  return createHash("sha256")
    .update(`${userId}:${phone}:${code}:${secret}`)
    .digest();
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Не авторизован" },
        { status: 401 }
      );
    }

    if (!process.env.AUTH_SECRET) {
      return NextResponse.json(
        { error: "Подтверждение телефона временно недоступно" },
        { status: 503 }
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Некорректный формат запроса" },
        { status: 400 }
      );
    }

    const input =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};

    const phone = normalizeE164Phone(input.phone);
    const code = input.code;

    if (!phone || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Некорректный номер или код" },
        { status: 400 }
      );
    }

    const challenge = await prisma.smsVerification.findFirst({
      where: {
        userId: session.user.id,
        phone,
        verifiedAt: null,
      },
      orderBy: { sentAt: "desc" },
    });

    const now = new Date();

    if (
      !challenge ||
      challenge.expiresAt.getTime() <= now.getTime() ||
      challenge.attempts >= MAX_ATTEMPTS
    ) {
      return NextResponse.json(
        { error: "Код истёк или больше недоступен. Запросите новый." },
        { status: 400 }
      );
    }

    const supplied = hashCode(session.user.id, phone, code);
    const expected = Buffer.from(challenge.codeHash, "hex");

    const matches =
      expected.length === supplied.length &&
      timingSafeEqual(supplied, expected);

    if (!matches) {
      const updated = await prisma.smsVerification.updateMany({
        where: {
          id: challenge.id,
          verifiedAt: null,
          attempts: { lt: MAX_ATTEMPTS },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        return NextResponse.json(
          { error: "Код уже использован или больше недоступен" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Неверный код" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const owner = await tx.user.findFirst({
        where: {
          phone,
          id: { not: session.user.id },
        },
        select: { id: true },
      });

      if (owner) {
        return "PHONE_TAKEN" as const;
      }

      const consumed = await tx.smsVerification.updateMany({
        where: {
          id: challenge.id,
          verifiedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: MAX_ATTEMPTS },
        },
        data: {
          verifiedAt: now,
        },
      });

      if (consumed.count !== 1) {
        return "CHALLENGE_INVALID" as const;
      }

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          phone,
          phoneVerifiedAt: now,
        },
      });

      return "SUCCESS" as const;
    });

    if (result === "PHONE_TAKEN") {
      return NextResponse.json(
        { error: "Этот номер уже связан с другой учётной записью" },
        { status: 409 }
      );
    }

    if (result !== "SUCCESS") {
      return NextResponse.json(
        { error: "Код уже использован или истёк. Запросите новый." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      phone,
      phoneVerified: true,
      message: "Номер телефона подтверждён",
    });
  } catch (error) {
    console.error("Ошибка подтверждения телефона:", error);

    return NextResponse.json(
      { error: "Ошибка сервера при подтверждении телефона" },
      { status: 500 }
    );
  }
}