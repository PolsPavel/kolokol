import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createReturnImpersonationToken } from "@/app/api/admin/impersonate/route";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 }
    );
  }

  const adminId = session.user.originalAdminId;

  if (!adminId) {
    return NextResponse.json(
      { error: "Нет активного сеанса просмотра пользователя" },
      { status: 400 }
    );
  }

  try {
    const token = await createReturnImpersonationToken(
      adminId,
      session.user.id
    );

    if (!token) {
      return NextResponse.json(
        { error: "Исходный администратор не найден или заблокирован" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error("Ошибка возврата администратора:", error);

    return NextResponse.json(
      { error: "Не удалось создать токен возврата" },
      { status: 500 }
    );
  }
}