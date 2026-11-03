import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteContext) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    if (
      body.accessExpiresAt !== undefined &&
      body.accessExpiresAt !== null &&
      (typeof body.accessExpiresAt !== "string" ||
        Number.isNaN(new Date(body.accessExpiresAt).getTime()))
    ) {
      return NextResponse.json(
        { error: "Некорректная дата окончания доступа" },
        { status: 400 }
      );
    }

    if (
      body.isDeleted !== undefined &&
      typeof body.isDeleted !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Некорректный статус аккаунта" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.accessExpiresAt !== undefined && {
          accessExpiresAt: body.accessExpiresAt
            ? new Date(body.accessExpiresAt)
            : null,
        }),
        ...(body.isDeleted !== undefined && {
          isDeleted: body.isDeleted,
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDeleted: true,
        accessExpiresAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Ошибка обновления пользователя:", error);

    return NextResponse.json(
      { error: "Ошибка обновления пользователя" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Вы не можете архивировать собственный аккаунт" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isDeleted: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    if (user.isDeleted) {
      return NextResponse.json({
        success: true,
        message: "Пользователь уже находится в архиве",
      });
    }

    await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        lastLogoutAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Пользователь перемещён в архив",
    });
  } catch (error) {
    console.error("Ошибка архивирования пользователя:", error);

    return NextResponse.json(
      { error: "Не удалось архивировать пользователя" },
      { status: 500 }
    );
  }
}