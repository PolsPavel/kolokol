// components/SessionTimer.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  expiresAt: string | null;
  isAdmin?: boolean;
  hasBalance?: boolean;
  onExpired?: () => void;
};

export function SessionTimer({ expiresAt, isAdmin, hasBalance, onExpired }: Props) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (isAdmin || hasBalance) return;

    // Если время вообще не задано, ставим дефолтные 3 часа от текущего момента
    if (!expiresAt) {
      setRemaining(3 * 60 * 60 * 1000);
      return;
    }

    const targetTime = new Date(expiresAt).getTime();
    if (isNaN(targetTime)) {
      setRemaining(0);
      return;
    }

    // ХИТРОСТЬ: Админ выдает 12 часов по умолчанию.
    // Чтобы бесплатный доступ длился ровно 3 часа, мы отнимаем от 12 часов 9 часов.
    // В итоге таймер стартует с 3:00:00 и честно тикает вниз.
    const FREE_HOURS = 3;
    const DEFAULT_ADMIN_HOURS = 12; // Если админ ставит другое время, можно поменять здесь
    const timeToSubtract = (DEFAULT_ADMIN_HOURS - FREE_HOURS) * 60 * 60 * 1000;
    
    // Итоговое время окончания бесплатного доступа
    let end = targetTime - timeToSubtract;
    
    // Если каким-то образом end оказался в прошлом (юзер зашел давно), ставим 0
    if (end < Date.now()) {
      // Но только если targetTime (реальное время окончания) еще не наступило
      // Если targetTime уже прошел, то доступ закрыт.
      if (targetTime > Date.now()) {
        // Ставим 3 часа от текущего момента (на случай если в базе старые данные)
        end = Date.now() + 3 * 60 * 60 * 1000;
      } else {
        end = Date.now();
      }
    }

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, end - now);
      setRemaining(diff);

      if (diff === 0 && onExpired) {
        onExpired();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isAdmin, hasBalance, onExpired]);

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-800 rounded-lg text-sm text-green-400 font-mono">
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        Без ограничений (Админ)
      </div>
    );
  }

  if (hasBalance) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 border border-blue-800 rounded-lg text-sm text-blue-400 font-mono">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        Без ограничений (Оплачено)
      </div>
    );
  }

  if (!expiresAt && remaining === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 font-mono">
        Время не задано
      </div>
    );
  }

  const totalSec = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  const isCritical = totalSec < 600; // меньше 10 минут
  const isWarning = totalSec < 3600; // меньше часа

  const color = isCritical
    ? "text-red-400 border-red-800 bg-red-900/30"
    : isWarning
    ? "text-yellow-400 border-yellow-800 bg-yellow-900/30"
    : "text-green-400 border-green-800 bg-green-900/30";

  const dot = isCritical ? "bg-red-500 animate-pulse" : isWarning ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-mono font-bold ${color}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`}></span>
      Время сессии: {pad(hours)}ч {pad(minutes)}мин {pad(seconds)}с
    </div>
  );
}