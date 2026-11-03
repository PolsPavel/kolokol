import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type ImpersonationToken = {
  targetUserId: string;
  originalAdminId: string | null;
  isReturn: boolean;
  expiresAt: number;
};

const TOKEN_TTL_MS = 60 * 1000;

// Временное хранилище процесса. При нескольких экземплярах приложения
// для production требуется общее хранилище токенов.
const impersonateTokens = new Map<string, ImpersonationToken>();

function cleanupExpiredTokens() {
  const now = Date.now();

  for (const [token, data] of impersonateTokens.entries()) {
    if (data.expiresAt <= now) {
      impersonateTokens.delete(token);
    }
  }
}

function createToken(data: ImpersonationToken): string {
  cleanupExpiredTokens();

  const token = randomBytes(32).toString("base64url");
  impersonateTokens.set(token, data);

  return token;
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
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        isDeleted: true,
      },
    });

    if (!admin || admin.isDeleted || admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      );
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

    const userId = (body as Record<string, unknown>).userId;

    if (typeof userId !== "string" || !userId || userId.length > 128) {
      return NextResponse.json(
        { error: "Некорректный userId" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isDeleted: true,
      },
    });

    if (!target || target.isDeleted) {
      return NextResponse.json(
        { error: "Пользователь не найден или удалён" },
        { status: 404 }
      );
    }

    if (target.role === "ADMIN") {
      return NextResponse.json(
        { error: "Вход от имени другого администратора запрещён" },
        { status: 403 }
      );
    }

    const token = createToken({
      targetUserId: target.id,
      originalAdminId: admin.id,
      isReturn: false,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });

    return NextResponse.json({
      success: true,
      token,
      expiresIn: TOKEN_TTL_MS / 1000,
    });
  } catch (error) {
    console.error("Ошибка создания impersonation-токена:", error);

    return NextResponse.json(
      { error: "Не удалось создать токен входа" },
      { status: 500 }
    );
  }
}

export async function createReturnImpersonationToken(
  adminId: string,
  currentUserId: string
): Promise<string | null> {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      role: true,
      isDeleted: true,
    },
  });

  if (
    !admin ||
    admin.isDeleted ||
    admin.role !== "ADMIN" ||
    !currentUserId
  ) {
    return null;
  }

  return createToken({
    targetUserId: admin.id,
    originalAdminId: null,
    isReturn: true,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
}

export function consumeImpersonateToken(
  token: string
): {
  targetUserId: string;
  isReturn: boolean;
  originalAdminId: string | null;
} | null {
  if (
    typeof token !== "string" ||
    token.length < 32 ||
    token.length > 128
  ) {
    return null;
  }

  cleanupExpiredTokens();

  const data = impersonateTokens.get(token);

  if (!data || data.expiresAt <= Date.now()) {
    impersonateTokens.delete(token);
    return null;
  }

  // Удаляем до возврата результата — повторное использование невозможно.
  impersonateTokens.delete(token);

  return {
    targetUserId: data.targetUserId,
    isReturn: data.isReturn,
    originalAdminId: data.originalAdminId,
  };
}