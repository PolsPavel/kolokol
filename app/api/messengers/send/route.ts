import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendMttSms } from "@/lib/sms/mtt";

const COST = 5;

async function reserve(
  userId: string,
  isAdmin: boolean,
  type: string,
  target: string
) {
  if (isAdmin) return true;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        monthlyLimit: true,
        currentSpent: true,
        accessExpiresAt: true,
      },
    });

    if (
      !user ||
      !user.accessExpiresAt ||
      user.accessExpiresAt <= new Date()
    ) {
      return false;
    }

    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        isDeleted: false,
        currentSpent: {
          lte: user.monthlyLimit - COST,
        },
      },
      data: {
        currentSpent: {
          increment: COST,
        },
      },
    });

    if (updated.count !== 1) return false;

    await tx.transaction.create({
      data: {
        userId,
        amount: -COST,
        type,
        description: `Отправка ${type} на ${target}`,
      },
    });

    return true;
  });
}

async function refund(
  userId: string,
  isAdmin: boolean,
  type: string,
  target: string
) {
  if (isAdmin) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        currentSpent: {
          decrement: COST,
        },
      },
    }),
    prisma.transaction.create({
      data: {
        userId,
        amount: COST,
        type: "refund",
        description: `Возврат за неотправленное сообщение (${type}) на ${target}`,
      },
    }),
  ]);
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 }
    );
  }

  try {
    const { channel, text, contacts } = await req.json();

    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 2000 ||
      !Array.isArray(contacts) ||
      contacts.length === 0 ||
      contacts.length > 500
    ) {
      return NextResponse.json(
        {
          error: "Проверьте текст и список получателей (не более 500)",
        },
        { status: 400 }
      );
    }

    if (!["telegram", "sms"].includes(channel)) {
      return NextResponse.json(
        { error: `Канал "${channel}" пока не поддерживается` },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN";

    const results: Array<{
      phone: string;
      status: "success" | "error";
      message?: string;
    }> = [];

    for (const contact of contacts) {
      const target =
        typeof contact?.phone === "string"
          ? contact.phone.trim()
          : "";

      if (!target) {
        results.push({
          phone: "",
          status: "error",
          message: "Не указан получатель",
        });
        continue;
      }

      const reserved = await reserve(
        session.user.id,
        isAdmin,
        channel,
        target
      );

      if (!reserved) {
        results.push({
          phone: target,
          status: "error",
          message: "Недостаточно средств или истёк срок доступа",
        });
        continue;
      }

      try {
        if (channel === "sms") {
          await sendMttSms(target, text.trim());
        } else {
          const apiKey = process.env.BOTGATE_API_KEY;
          const botId = process.env.BOTGATE_BOT_ID;

          if (!apiKey || !botId) {
            throw new Error("BOTGATE_NOT_CONFIGURED");
          }

          const response = await fetch(
            `https://bot-gate.ru/api/v1/bots/${botId}/sendMessage`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                chat_id: target,
                text: text.trim(),
              }),
              signal: AbortSignal.timeout(15000),
            }
          );

          const data = await response.json().catch(() => null);

          if (!response.ok || !data?.ok) {
            throw new Error("BOTGATE_SEND_FAILED");
          }
        }

        results.push({
          phone: target,
          status: "success",
        });
      } catch (error) {
        await refund(
          session.user.id,
          isAdmin,
          channel,
          target
        );

        console.error(`Ошибка отправки ${channel}:`, error);

        results.push({
          phone: target,
          status: "error",
          message:
            channel === "sms"
              ? "Ошибка отправки SMS"
              : "Ошибка отправки Telegram",
        });
      }
    }

    const sent = results.filter(
      (item) => item.status === "success"
    ).length;

    return NextResponse.json({
      success: true,
      total: contacts.length,
      sent,
      failed: contacts.length - sent,
      totalCost: isAdmin ? 0 : sent * COST,
      details: results,
    });
  } catch (error) {
    console.error("Ошибка API рассылки:", error);

    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}