import { NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeE164Phone } from "@/lib/phone";
import { sendMttSms } from "@/lib/sms/mtt";

export const runtime = "nodejs";

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const MAX_REQUESTS_PER_DAY = 10;

function hashCode(userId: string, phone: string, code: string): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  }

  return createHash("sha256")
    .update(`${userId}:${phone}:${code}:${secret}`)
    .digest("hex");
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
      console.error("SMS verification unavailable: AUTH_SECRET is missing");

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

    const phone = normalizeE164Phone(
      typeof body === "object" && body !== null && "phone" in body
        ? body.phone
        : null
    );

    if (!phone) {
      return NextResponse.json(
        { error: "Укажите номер в международном формате, например +371..." },
        { status: 400 }
      );
    }

    const existingOwner = await prisma.user.findFirst({
      where: {
        phone,
        id: { not: session.user.id },
      },
      select: { id: true },
    });

    if (existingOwner) {
      return NextResponse.json(
        { error: "Этот номер уже связан с другой учётной записью" },
        { status: 409 }
      );
    }

    const now = new Date();
    const cooldownStart = new Date(now.getTime() - RESEND_COOLDOWN_MS);
    const windowStart = new Date(now.getTime() - RATE_WINDOW_MS);
    const dayStart = new Date(now.getTime() - DAILY_WINDOW_MS);

    const recentSamePhone = await prisma.smsVerification.findFirst({
      where: {
        userId: session.user.id,
        phone,
        sentAt: { gte: cooldownStart },
      },
      select: { id: true },
    });

    if (recentSamePhone) {
      return NextResponse.json(
        { error: "Подождите минуту перед повторным запросом кода" },
        { status: 429 }
      );
    }

    const [recentCount, dailyCount] = await Promise.all([
      prisma.smsVerification.count({
        where: {
          userId: session.user.id,
          sentAt: { gte: windowStart },
        },
      }),
      prisma.smsVerification.count({
        where: {
          userId: session.user.id,
          sentAt: { gte: dayStart },
        },
      }),
    ]);

    if (
      recentCount >= MAX_REQUESTS_PER_WINDOW ||
      dailyCount >= MAX_REQUESTS_PER_DAY
    ) {
      return NextResponse.json(
        { error: "Превышен лимит запросов SMS-кода. Попробуйте позже." },
        { status: 429 }
      );
    }

    const code = randomInt(0, 1_000_000)
      .toString()
      .padStart(6, "0");

    await prisma.smsVerification.create({
      data: {
        userId: session.user.id,
        phone,
        codeHash: hashCode(session.user.id, phone, code),
        expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      },
      select: { id: true },
    });

    try {
      await sendMttSms(
        phone,
        `Код подтверждения телефона: ${code}. Действует 5 минут.`
      );
    } catch (error) {
      console.error("Не удалось отправить SMS через МТТ:", error);

      // Запись сохраняется для ограничения повторных запросов,
      // но код не возвращается клиенту.
      return NextResponse.json(
        { error: "Не удалось отправить SMS. Попробуйте позже." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Код отправлен. Он действует 5 минут.",
    });
  } catch (error) {
    console.error("Ошибка запроса SMS-кода:", error);

    return NextResponse.json(
      { error: "Не удалось обработать запрос" },
      { status: 500 }
    );
  }
}