// app/api/audio/download/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const PRICE_PER_1000_CHARS = 15; // 15 рублей за 1000 символов
const FREE_CHAR_LIMIT = 100; // Бесплатно до 100 символов
const FREE_ROLLS_LIMIT = 2; // Не более 2 бесплатных роликов с нулевого баланса

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { textLength, type } = body;

    if (typeof textLength !== "number" || textLength <= 0) {
      return NextResponse.json({ error: "Некорректная длина текста" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, monthlyLimit: true, currentSpent: true, isDeleted: true },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    const balance = user.monthlyLimit - user.currentSpent;

    // Админы качают бесплатно
    if (user.role === "ADMIN") {
      return NextResponse.json({ success: true, cost: 0, message: "Скачивание разрешено (Админ)" });
    }

    // Если баланс <= 0, проверяем бесплатные лимиты
    if (balance <= 0) {
      // Для микрофонных записей бесплатный лимит не действует
      if (type === "recorded") {
        return NextResponse.json({ 
          error: "Недостаточно средств. Пополните баланс для скачивания записей с микрофона.",
          requiresTopUp: true 
        }, { status: 403 });
      }

      if (textLength > FREE_CHAR_LIMIT) {
        return NextResponse.json({ 
          error: "Недостаточно средств. Пополните баланс для скачивания роликов длиннее 100 символов.",
          requiresTopUp: true 
        }, { status: 403 });
      }

      const freeDownloads = await prisma.transaction.count({
        where: { userId: user.id, type: "audio_download_free" },
      });

      if (freeDownloads >= FREE_ROLLS_LIMIT) {
        return NextResponse.json({ 
          error: "Лимит бесплатных скачиваний исчерпан. Пополните баланс.",
          requiresTopUp: true 
        }, { status: 403 });
      }

      await prisma.transaction.create({
        data: {
          userId: user.id,
          amount: 0,
          type: "audio_download_free",
          description: `Бесплатное скачивание ролика (${textLength} символов)`,
        },
      });

      return NextResponse.json({ success: true, cost: 0, message: "Бесплатное скачивание" });
    }

    // Если баланс > 0, рассчитываем стоимость
    let cost = 0;
    if (textLength > FREE_CHAR_LIMIT) {
      const blocks = Math.ceil(textLength / 1000);
      cost = blocks * PRICE_PER_1000_CHARS;
    }

    if (cost > balance) {
      return NextResponse.json({ 
        error: `Недостаточно средств. Стоимость скачивания: ${cost} ₽, доступно: ${balance.toFixed(2)} ₽`,
        requiresTopUp: true 
      }, { status: 403 });
    }

    // Списываем средства
    if (cost > 0) {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({
          where: { id: user.id, currentSpent: user.currentSpent },
          data: { currentSpent: { increment: cost } },
        });
        if (updated.count !== 1) throw new Error("BALANCE_CHANGED");
        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: -cost,
            type: "audio_download",
            description: `Скачивание аудиоролика (${textLength} символов)`,
          },
        });
      });
    }

    return NextResponse.json({ 
      success: true, 
      cost, 
      message: `Скачивание разрешено. Списано ${cost} ₽` 
    });

  } catch (error) {
    console.error("Ошибка при проверке скачивания:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}