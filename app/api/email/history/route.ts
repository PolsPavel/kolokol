import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Не авторизован" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const history = await prisma.emailBroadcast.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
      select: {
        id: true,
        subject: true,
        totalCount: true,
        sentCount: true,
        failedCount: true,
        skippedCount: true,
        details: true,
        createdAt: true,
      },
    });

    const parsedHistory = history.map((item) => {
      let details: unknown = null;

      if (item.details) {
        try {
          details = JSON.parse(item.details);
        } catch {
          details = null;
        }
      }

      return {
        ...item,
        details,
      };
    });

    return NextResponse.json(parsedHistory);
  } catch (error) {
    console.error("Ошибка получения истории рассылок:", error);

    return NextResponse.json(
      { error: "Не удалось получить историю рассылок" },
      { status: 500 }
    );
  }
}