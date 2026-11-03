import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId || userId.length > 128) {
    return NextResponse.json(
      { error: "Не указан корректный ID пользователя" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isDeleted: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 500,
          select: {
            id: true,
            amount: true,
            type: true,
            description: true,
            createdAt: true,
          },
        },
        emailBroadcasts: {
          orderBy: { createdAt: "desc" },
          take: 200,
          select: {
            id: true,
            subject: true,
            totalCount: true,
            sentCount: true,
            failedCount: true,
            skippedCount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user || !user.isDeleted) {
      return NextResponse.json(
        { error: "Архивный пользователь не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      transactions: user.transactions,
      emailBroadcasts: user.emailBroadcasts,
    });
  } catch (error) {
    console.error("Ошибка загрузки истории пользователя:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить историю пользователя" },
      { status: 500 }
    );
  }
}