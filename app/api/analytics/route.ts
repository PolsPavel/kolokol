import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const [user, transactions, broadcasts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          role: true,
          phone: true,
          phoneVerifiedAt: true,
          monthlyLimit: true,
          currentSpent: true,
          isDeleted: true,
        },
      }),
      prisma.transaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.emailBroadcast.findMany({
        where: { userId: session.user.id },
        select: {
          totalCount: true,
          sentCount: true,
          failedCount: true,
          createdAt: true,
        },
      }),
    ]);

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const email = broadcasts.reduce(
      (sum, item) => ({
        total: sum.total + item.totalCount,
        sent: sum.sent + item.sentCount,
        failed: sum.failed + item.failedCount,
      }),
      { total: 0, sent: 0, failed: 0 }
    );

    return NextResponse.json({
      phone: user.phone,
      phoneVerified: Boolean(user.phoneVerifiedAt),
      balance:
        user.role === "ADMIN"
          ? null
          : Math.max(0, user.monthlyLimit - user.currentSpent),
      monthlyLimit: user.monthlyLimit,
      totalSpent: user.currentSpent,
      transactions,
      email,
    });
  } catch (error) {
    console.error("Ошибка аналитики:", error);

    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}