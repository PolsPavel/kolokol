import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

class BalanceUpdateError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BalanceUpdateError";
    this.status = status;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 }
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Доступ запрещён" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    if (!id || id.length > 128) {
      return NextResponse.json(
        { error: "Некорректный идентификатор пользователя" },
        { status: 400 }
      );
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Некорректные данные запроса" },
        { status: 400 }
      );
    }

    const amount = (body as Record<string, unknown>).amount;

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount === 0 ||
      Math.abs(amount) > 1000000000 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
    ) {
      return NextResponse.json(
        { error: "Сумма должна быть ненулевым числом с точностью до копеек" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          isDeleted: true,
          monthlyLimit: true,
          currentSpent: true,
        },
      });

      if (!user) {
        throw new BalanceUpdateError("Пользователь не найден", 404);
      }

      if (user.role === "ADMIN") {
        throw new BalanceUpdateError(
          "Изменение лимита другого администратора запрещено этим методом",
          403
        );
      }

      const newLimit = Math.round((user.monthlyLimit + amount) * 100) / 100;

      if (
        !Number.isFinite(newLimit) ||
        newLimit < user.currentSpent
      ) {
        throw new BalanceUpdateError(
          "Новый лимит не может быть меньше уже потраченной суммы",
          400
        );
      }

      const update = await tx.user.updateMany({
        where: {
          id: user.id,
          monthlyLimit: user.monthlyLimit,
          currentSpent: user.currentSpent,
        },
        data: {
          monthlyLimit: newLimit,
        },
      });

      if (update.count !== 1) {
        throw new BalanceUpdateError(
          "Данные пользователя изменились. Повторите операцию.",
          409
        );
      }

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: "admin_adjustment",
          description: `Корректировка лимита администратором ${session.user.id}`,
        },
      });

      return {
        monthlyLimit: newLimit,
        currentSpent: user.currentSpent,
        availableBalance: newLimit - user.currentSpent,
      };
    });

    return NextResponse.json({
      success: true,
      newLimit: result.monthlyLimit,
      currentSpent: result.currentSpent,
      availableBalance: result.availableBalance,
    });
  } catch (error) {
    if (error instanceof BalanceUpdateError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Ошибка изменения лимита пользователя:", error);

    return NextResponse.json(
      { error: "Не удалось изменить лимит пользователя" },
      { status: 500 }
    );
  }
}