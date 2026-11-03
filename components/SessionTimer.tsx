// components/SessionTimer.tsx
"use client";
import { useEffect, useState } from "react";

type Props = {
  expiresAt: string | null;
  isAdmin?: boolean;
  onExpired?: () => void;
};

export function SessionTimer({ expiresAt, isAdmin, onExpired }: Props) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;

    const update = () => {
      const now = Date.now();
      const end = new Date(expiresAt).getTime();
      if (isNaN(end)) {
        setRemaining(0);
        return;
      }
      const diff = Math.max(0, end - now);
      setRemaining(diff);
      if (diff === 0 && onExpired) {
        onExpired();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-800 rounded-lg text-sm text-green-400 font-mono">
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        Без ограничений
      </div>
    );
  }

  if (!expiresAt) {
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
  
  const isCritical = totalSec < 600;
  const isWarning = totalSec < 3600;

  const color = isCritical
    ? "text-red-400 border-red-800 bg-red-900/30"
    : isWarning
    ? "text-yellow-400 border-yellow-800 bg-yellow-900/30"
    : "text-green-400 border-green-800 bg-green-900/30";
  const dot = isCritical
    ? "bg-red-500 animate-pulse"
    : isWarning
    ? "bg-yellow-500"
    : "bg-green-500";

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-mono font-bold ${color}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`}></span>
      Время сессии: {pad(hours)}ч {pad(minutes)}мин {pad(seconds)}с
    </div>
  );
}