import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

// 1. GET-запрос: пользователь перешёл по ссылке отписки из письма
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  let saved = false;

  if (email) {
    try {
      await prisma.unsubscribe.upsert({
        where: { email },
        update: {},
        create: {
          email,
          reason: "Переход по ссылке из письма",
        },
      });

      saved = true;
    } catch (error) {
      console.error("Ошибка при сохранении отписки:", error);
    }
  }

  const safeEmail = email ? escapeHtml(email) : "";
  const status = saved ? 200 : email ? 500 : 400;

  const title = saved
    ? "Вы успешно отписаны"
    : email
      ? "Не удалось оформить отписку"
      : "Некорректная ссылка";

  const message = saved
    ? `Адрес <b>${safeEmail}</b> добавлен в стоп-лист.`
    : email
      ? "Не удалось сохранить отписку. Пожалуйста, попробуйте позже."
      : "В ссылке отсутствует адрес электронной почты.";

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>${title}</title>
  <style>
    body {
      background-color: #0a0a0a;
      color: #ffffff;
      font-family: Georgia, serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }

    .container {
      background: #1f1f1f;
      padding: 40px;
      border-radius: 16px;
      border: 1px solid #333;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      max-width: 400px;
      width: 100%;
      box-sizing: border-box;
    }

    h1 {
      color: #FACC15;
      margin-bottom: 10px;
    }

    p {
      color: #ccc;
      font-size: 16px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    a {
      color: #FACC15;
      text-decoration: none;
      margin-top: 20px;
      display: inline-block;
    }

    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>${message}</p>
    ${
      saved
        ? "<p>Вы больше не будете получать от нас письма.</p>"
        : ""
    }
    <a href="/">Вернуться на главную</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    },
  });
}

// 2. POST-запрос: ручное добавление в стоп-лист из интерфейса
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email обязателен" },
        { status: 400 }
      );
    }

    await prisma.unsubscribe.upsert({
      where: { email },
      update: {},
      create: {
        email,
        reason: "Добавлено вручную",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка добавления в стоп-лист:", error);

    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

// 3. DELETE-запрос: удаление из стоп-листа
// Оставлен без изменений по указанию пользователя.
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email обязателен" },
        { status: 400 }
      );
    }

    await prisma.unsubscribe.delete({ where: { email } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления из стоп-листа:", error);

    return NextResponse.json(
      { error: "Ошибка при удалении" },
      { status: 500 }
    );
  }
}