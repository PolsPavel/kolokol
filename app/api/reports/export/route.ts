// app/api/reports/export/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const [user, transactions, broadcasts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isDeleted: true, temporaryPassword: true, email: true },
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
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
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
      [`Ваш логин: ${user.email}`],
      [`Пароль: ${user.temporaryPassword || "не задан"}`],
      [],
    ];

    const finalWorksheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.sheet_add_aoa(finalWorksheet, headerRows, { origin: "A1" });
    XLSX.utils.sheet_add_json(finalWorksheet, rows, { origin: "A6" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, finalWorksheet, "Операции");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="kolokol-report.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Ошибка формирования отчёта:", error);
    return NextResponse.json({ error: "Не удалось сформировать отчёт" }, { status: 500 });
  }
}