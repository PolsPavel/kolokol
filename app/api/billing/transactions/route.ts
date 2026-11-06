import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const rawLimit = url.searchParams.get("limit");
  const rawOffset = url.searchParams.get("offset");

  const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
  const offset = rawOffset === null ? 0 : Number(rawOffset);

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIMIT ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 1000000
  ) {
    return NextResponse.json(
      { error: "Некорректные параметры пагинации" },
      { status: 400 }
    );
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      skip: offset,
      take: limit,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
    });

    // Сохраняем прежний формат ответа — массив транзакций.
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Ошибка получения истории транзакций:", error);

    return NextResponse.json(
      { error: "Не удалось получить историю операций" },
      { status: 500 }
    );
  }
}