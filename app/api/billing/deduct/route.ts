import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const PRICES = {
  call: 2.5,
  sms: 5.0,
  email: 0.5,
} as const;

type ActionType = keyof typeof PRICES;

class BillingError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BillingError";
    this.status = status;
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Некорректные данные запроса" },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const type = data.type;
    const quantity = data.quantity === undefined ? 1 : data.quantity;

    if (
      typeof type !== "string" ||
      !Object.prototype.hasOwnProperty.call(PRICES, type)
    ) {
      return NextResponse.json(
        { error: "Неизвестный тип действия" },
        { status: 400 }
      );
    }

    if (
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 100000
    ) {
      return NextResponse.json(
        { error: "Количество должно быть целым числом от 1 до 100000" },
        { status: 400 }
      );
    }

    const actionType = type as ActionType;
    const cost = PRICES[actionType] * quantity;

    if (!Number.isFinite(cost) || cost <= 0) {
      return NextResponse.json(
        { error: "Некорректная стоимость операции" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          role: true,
          isDeleted: true,
          monthlyLimit: true,
          currentSpent: true,
        },
      });

      if (!user || user.isDeleted) {
        throw new BillingError("Пользователь не найден", 404);
      }

      if (user.role === "ADMIN") {
        return {
          admin: true,
          newSpent: user.currentSpent,
          newBalance: 0,
        };
      }

      const availableBalance = user.monthlyLimit - user.currentSpent;

      if (
        !Number.isFinite(availableBalance) ||
        availableBalance < cost
      ) {
        throw new BillingError(
          `Недостаточно средств. Доступно: ${Math.max(
            0,
            availableBalance
          ).toFixed(2)} ₽, требуется: ${cost.toFixed(2)} ₽`,
          403
        );
      }

      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          isDeleted: false,
          role: "USER",
          currentSpent: user.currentSpent,
          monthlyLimit: {
            gte: user.currentSpent + cost,
          },
        },
        data: {
          currentSpent: {
            increment: cost,
          },
        },
      });

      if (updated.count !== 1) {
        throw new BillingError(
          "Баланс изменился во время операции. Повторите запрос.",
          409
        );
      }

      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          currentSpent: true,
          monthlyLimit: true,
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -cost,
          type: actionType,
          description: `Оплата ${actionType}: ${quantity} шт.`,
        },
      });

      return {
        admin: false,
        newSpent: updatedUser.currentSpent,
        newBalance:
          updatedUser.monthlyLimit - updatedUser.currentSpent,
      };
    });

    return NextResponse.json({
      success: true,
      newSpent: result.newSpent,
      newBalance: result.newBalance,
    });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Ошибка списания средств:", error);

    return NextResponse.json(
      { error: "Не удалось выполнить списание" },
      { status: 500 }
    );
  }
}