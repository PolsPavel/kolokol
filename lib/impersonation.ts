import { randomBytes } from "node:crypto";

type ImpersonationToken = {
  targetUserId: string;
  originalAdminId: string | null;
  isReturn: boolean;
  expiresAt: number;
};

type CreateImpersonationTokenInput = {
  targetUserId: string;
  originalAdminId: string;
  isReturn?: false;
};

type CreateReturnTokenInput = {
  targetUserId: string;
  isReturn: true;
};

const TOKEN_TTL_MS = 60 * 1000;

const tokens = new Map<string, ImpersonationToken>();

/**
 * Удаляет просроченные токены.
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();

  for (const [token, data] of tokens.entries()) {
    if (data.expiresAt <= now) {
      tokens.delete(token);
    }
  }
}

/**
 * Создаёт случайный одноразовый токен.
 */
function storeToken(
  data: Omit<ImpersonationToken, "expiresAt">
): string {
  cleanupExpiredTokens();

  const token = randomBytes(32).toString("base64url");

  tokens.set(token, {
    ...data,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return token;
}

/**
 * Создание токена для входа администратора
 * от имени обычного пользователя.
 */
export function createImpersonateToken(
  targetUserId: string,
  originalAdminId: string
): string {
  if (!targetUserId || !originalAdminId) {
    throw new Error("Не указаны идентификаторы пользователей");
  }

  return storeToken({
    targetUserId,
    originalAdminId,
    isReturn: false,
  });
}

/**
 * Создание токена для возврата в административный аккаунт.
 */
export function createReturnImpersonationToken(
  adminId: string
): string {
  if (!adminId) {
    throw new Error("Не указан идентификатор администратора");
  }

  return storeToken({
    targetUserId: adminId,
    originalAdminId: null,
    isReturn: true,
  });
}

/**
 * Проверяет токен и удаляет его из хранилища.
 * Повторное использование невозможно в рамках
 * одного экземпляра работающего приложения.
 */
export function consumeImpersonateToken(
  token: string
): {
  targetUserId: string;
  originalAdminId: string | null;
  isReturn: boolean;
} | null {
  if (
    typeof token !== "string" ||
    token.length < 32 ||
    token.length > 128
  ) {
    return null;
  }

  cleanupExpiredTokens();

  const data = tokens.get(token);

  if (!data || data.expiresAt <= Date.now()) {
    tokens.delete(token);
    return null;
  }

  // Удаляем токен до передачи результата вызывающему коду.
  tokens.delete(token);

  return {
    targetUserId: data.targetUserId,
    originalAdminId: data.originalAdminId,
    isReturn: data.isReturn,
  };
}