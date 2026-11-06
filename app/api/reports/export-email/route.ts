import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return NextResponse.json(
      { error: "Почтовый сервер не настроен" },
      { status: 503 }
    );
  }

  const port = Number(SMTP_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return NextResponse.json(
      { error: "Некорректная настройка SMTP-порта" },
      { status: 503 }
    );
  }

  try {
    const [user, transactions, broadcasts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isDeleted: true },
      }),
      prisma.transaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.emailBroadcast.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const rows = [
      ...transactions.map((item) => ({
        Дата: item.createdAt.toISOString(),
        Тип: item.type,
        Сумма: item.amount,
        Описание: item.description,
      })),
      ...broadcasts.map((item) => ({
        Дата: item.createdAt.toISOString(),
        Тип: "email_broadcast",
        Сумма: "",
        Описание: `${item.subject}; всего ${item.totalCount}; отправлено ${item.sentCount}; ошибок ${item.failedCount}`,
      })),
    ].sort((a, b) => b.Дата.localeCompare(a.Дата));

    const headerRows = [
      [`С полным отчётом ознакомьтесь в личном кабинете по адресу ${process.env.NEXTAUTH_URL || "https://kolokol.ru"}`],
      [`Ваш логин: ${session.user.email}`],
      [`Пароль: (используйте пароль, который высылал администратор при входе)`],
      [], // Пустая строка
    ];

    // Создаем лист, добавляем шапку, затем данные
    const finalWorksheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.sheet_add_aoa(finalWorksheet, headerRows, { origin: "A1" });
    XLSX.utils.sheet_add_json(finalWorksheet, rows, { origin: "A6" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, finalWorksheet, "Операции");

    const file = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    await transporter.sendMail({
      from: `"KoloKol" <${SMTP_USER}>`,
      to: session.user.email,
      subject: "Отчёт KoloKol",
      text: "Во вложении находится отчёт по операциям вашего аккаунта.",
      attachments: [
        {
          filename: "kolokol-report.xlsx",
          content: file,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      sentTo: session.user.email,
    });
  } catch (error) {
    console.error("Ошибка отправки отчёта:", error);

    return NextResponse.json(
      { error: "Не удалось отправить отчёт на почту" },
      { status: 502 }
    );
  }
}