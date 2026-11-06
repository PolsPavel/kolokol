"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Transaction = {
  id: string;
  description?: string | null;
  amount: number;
};

type EmailBroadcast = {
  id: string;
  subject?: string | null;
  sentCount: number;
  totalCount: number;
};

type UserHistory = {
  id: string;
  name?: string | null;
  email?: string | null;
  isDeleted?: boolean;
  createdAt: string;
  role: string;
  currentSpent: number;
  transactions: Transaction[];
  emailBroadcasts: EmailBroadcast[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isTransaction(value: unknown): value is Transaction {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.amount === "number"
  );
}

function isEmailBroadcast(value: unknown): value is EmailBroadcast {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.sentCount === "number" &&
    typeof value.totalCount === "number"
  );
}

function isUserHistory(value: unknown): value is UserHistory {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.role === "string" &&
    typeof value.currentSpent === "number" &&
    Array.isArray(value.transactions) &&
    value.transactions.every(isTransaction) &&
    Array.isArray(value.emailBroadcasts) &&
    value.emailBroadcasts.every(isEmailBroadcast)
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Дата неизвестна"
    : date.toLocaleString("ru-RU");
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function UserHistoryPage() {
  const [users, setUsers] = useState<UserHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/admin/history", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Не удалось загрузить историю (HTTP ${response.status}).`,
          );
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error(
            "Сервер вернул данные в неожиданном формате.",
          );
        }

        setUsers(data.filter(isUserHistory));
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Ошибка загрузки истории пользователей:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить историю пользователей.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => controller.abort();
  }, []);

  if (isLoading) {
    return (
      <div
        className="p-8 text-center text-gray-400"
        role="status"
        aria-live="polite"
      >
        Загрузка истории...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">
            История пользователей
          </h2>

          <p className="text-sm text-gray-400">
            Данные о всех когда-либо созданных аккаунтах
          </p>
        </div>

        <Link
          href="/dashboard/team"
          className="text-sm font-medium text-[#FACC15] hover:text-yellow-400"
        >
          ← Назад к команде
        </Link>
      </div>

      {errorMessage && (
        <div
          className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300"
          role="alert"
        >
          <p>{errorMessage}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 underline hover:text-white"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {!errorMessage && users.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-6 text-center text-gray-400">
          История пользователей пока пуста.
        </div>
      )}

      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className={`rounded-xl border bg-[#1f1f1f] p-5 ${
              user.isDeleted
                ? "border-red-900/50 opacity-75"
                : "border-gray-800"
            }`}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-gray-800 pb-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-lg font-bold text-white">
                    {user.name || "Без имени"}
                  </h3>

                  {user.isDeleted && (
                    <span className="rounded bg-red-900/50 px-2 py-0.5 text-xs text-red-400">
                      Удалён
                    </span>
                  )}
                </div>

                <p className="break-all text-sm text-gray-400">
                  {user.email || "Email не указан"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Создан: {formatDate(user.createdAt)} · Роль:{" "}
                  {user.role === "ADMIN" ? "Админ" : "Менеджер"}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-gray-400">
                  Потрачено
                </p>

                <p className="text-lg font-bold text-[#FACC15]">
                  {formatAmount(user.currentSpent)} ₽
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-300">
                  Последние транзакции
                </h4>

                {user.transactions.length > 0 ? (
                  <ul className="space-y-1">
                    {user.transactions.map((transaction) => (
                      <li
                        key={transaction.id}
                        className="flex justify-between gap-3 rounded bg-black/30 p-2 text-xs text-gray-400"
                      >
                        <span className="break-words">
                          {transaction.description ||
                            "Без описания"}
                        </span>

                        <span className="shrink-0 text-red-400">
                          -{formatAmount(transaction.amount)} ₽
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">
                    Нет транзакций
                  </p>
                )}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-300">
                  Последние рассылки
                </h4>

                {user.emailBroadcasts.length > 0 ? (
                  <ul className="space-y-1">
                    {user.emailBroadcasts.map((broadcast) => (
                      <li
                        key={broadcast.id}
                        className="rounded bg-black/30 p-2 text-xs text-gray-400"
                      >
                        <p className="break-words font-medium text-gray-300">
                          {broadcast.subject || "Без темы"}
                        </p>

                        <p>
                          Отправлено: {broadcast.sentCount} /{" "}
                          {broadcast.totalCount}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">
                    Нет рассылок
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}