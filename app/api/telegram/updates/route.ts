import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

type TelegramUpdate = {
  update_id: number;
  message?: {
    chat?: { id: number | string };
    from?: { username?: string };
    text?: string;
  };
};

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Доступ запрещён" },
      { status: 403 },
    );
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Интеграция Telegram не настроена" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates`,
      {
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Telegram API временно недоступен" },
        { status: 502 },
      );
    }

    const data: unknown = await response.json();

    if (
      !data ||
      typeof data !== "object" ||
      !("ok" in data) ||
      data.ok !== true ||
      !("result" in data) ||
      !Array.isArray(data.result)
    ) {
      return NextResponse.json(
        { error: "Telegram API отклонил запрос" },
        { status: 502 },
      );
    }

    const updates = data.result as TelegramUpdate[];

    const lastUpdate = [...updates]
      .reverse()
      .find((item) => item.message?.chat?.id != null);

    const message = lastUpdate?.message;
    const chat = message?.chat;

    if (!message || chat?.id == null) {
      return NextResponse.json({
        message:
          "Нет новых сообщений. Напишите боту /start и повторите запрос.",
      });
    }

    return NextResponse.json({
      chatId: chat.id,
      username: message.from?.username ?? null,
      message: "Chat ID найден.",
    });
  } catch (error) {
    console.error("Ошибка Telegram API:", error);

    return NextResponse.json(
      { error: "Не удалось связаться с Telegram" },
      { status: 502 },
    );
  }
}