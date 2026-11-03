import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
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
        Источник: "Финансовая операция",
      })),
      ...broadcasts.map((item) => ({
        Дата: item.createdAt.toISOString(),
        Тип: "email_broadcast",
        Сумма: "",
        Описание: item.subject,
        Источник: `Всего: ${item.totalCount}; отправлено: ${item.sentCount}; ошибок: ${item.failedCount}`,
      })),
    ].sort((a, b) => b.Дата.localeCompare(a.Дата));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Операции");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="kolokol-report.xlsx"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Ошибка формирования отчёта:", error);

    return NextResponse.json(
      { error: "Не удалось сформировать отчёт" },
      { status: 500 }
    );
  }
}