"use client";

import { useEffect, useState } from "react";

type AccessStatus = {
  accessExpiresAt: string | null;
  remainingMs: number | null;
  isExpired: boolean;
  role: string;
};

export function AccessTimer() {
  const [status, setStatus] = useState<AccessStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/access-status", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Не удалось получить статус доступа.");
        }

        const data: unknown = await res.json();

        if (
          typeof data !== "object" ||
          data === null ||
          !("role" in data) ||
          typeof data.role !== "string" ||
          !("isExpired" in data) ||
          typeof data.isExpired !== "boolean" ||
          !("remainingMs" in data) ||
          (typeof data.remainingMs !== "number" &&
            data.remainingMs !== null) ||
          !("accessExpiresAt" in data) ||
          (typeof data.accessExpiresAt !== "string" &&
            data.accessExpiresAt !== null)
        ) {
          throw new Error("Сервер вернул некорректный статус доступа.");
        }

        if (isMounted) {
          setStatus({
            role: data.role,
            isExpired: data.isExpired,
            remainingMs: data.remainingMs,
            accessExpiresAt: data.accessExpiresAt,
          });
          setError(false);
        }
      } catch (err) {
        console.error("Ошибка получения статуса доступа:", err);

        if (isMounted) {
          setError(true);
        }
      }
    };

    void fetchStatus();

    // Обновляем статус каждые 5 секунд.
    const interval = window.setInterval(() => {
      void fetchStatus();
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  if (error || !status) {
    return null;
  }

  if (status.role === "ADMIN") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Администратор (без ограничений)
      </div>
    );
  }

  if (
    status.isExpired ||
    (status.remainingMs !== null && status.remainingMs <= 0)
  ) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-red-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        Доступ истёк — обратитесь к админу
      </div>
    );
  }

  // Если срок окончания доступа не ограничен, таймер не отображаем.
  if (status.remainingMs === null) {
    return null;
  }

  const totalSec = Math.max(0, Math.floor(status.remainingMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (value: number) => value.toString().padStart(2, "0");

  let colorClass = "text-green-400";
  let dotClass = "bg-green-500";

  if (totalSec < 3600) {
    colorClass = "text-yellow-400";
    dotClass = "bg-yellow-500";
  }

  if (totalSec < 600) {
    colorClass = "text-red-400";
    dotClass = "bg-red-500 animate-pulse";
  }

  const display =
    days > 0
      ? `${days}д ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <div
      className={`flex items-center gap-2 font-mono text-sm font-medium ${colorClass}`}
      role="status"
      aria-live="polite"
    >
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      Доступ: {display}
    </div>
  );
}
