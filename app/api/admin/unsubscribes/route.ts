import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DELETE_COUNT = 500;

async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: "Не авторизован" },
        { status: 401 }
      ),
    };
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      isDeleted: true,
    },
  });

  if (!admin || admin.isDeleted || admin.role !== "ADMIN") {
    return {
      response: NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      ),
    };
  }

  return { admin };
}

export async function GET() {
  try {
    const access = await requireAdmin();

    if ("response" in access) {
      return access.response;
    }

    const list = await prisma.unsubscribe.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        email: true,
        reason: true,
        createdAt: true,
      },
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error("Ошибка получения стоп-листа:", error);

    return NextResponse.json(
      { error: "Не удалось получить стоп-лист" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const access = await requireAdmin();

    if ("response" in access) {
      return access.response;
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Некорректный JSON" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Некорректные данные запроса" },
        { status: 400 }
      );
    }

    const rawEmails = (body as Record<string, unknown>).emails;

    if (
      !Array.isArray(rawEmails) ||
      rawEmails.length === 0 ||
      rawEmails.length > MAX_DELETE_COUNT
    ) {
      return NextResponse.json(
        { error: `Передайте от 1 до ${MAX_DELETE_COUNT} email-адресов` },
        { status: 400 }
      );
    }

    if (rawEmails.some((value) => typeof value !== "string")) {
      return NextResponse.json(
        { error: "Все адреса должны быть строками" },
        { status: 400 }
      );
    }

    const emails = [
      ...new Set(
        (rawEmails as string[]).map((email) =>
          email.trim().toLowerCase()
        )
      ),
    ];

    if (
      emails.some(
        (email) =>
          email.length > 254 ||
          !EMAIL_PATTERN.test(email)
      )
    ) {
      return NextResponse.json(
        { error: "Список содержит некорректный email" },
        { status: 400 }
      );
    }

    const result = await prisma.unsubscribe.deleteMany({
      where: {
        email: { in: emails },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Ошибка удаления из стоп-листа:", error);

    return NextResponse.json(
      { error: "Не удалось удалить адреса из стоп-листа" },
      { status: 500 }
    );
  }
}