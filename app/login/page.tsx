// app/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  // ❗️ ПОЛЯ ПУСТЫЕ
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (res?.error) {
        setError("Неверный email или пароль");
        return;
      }

      if (!res || res.ok === false) {
        setError("Не удалось выполнить вход. Попробуйте ещё раз.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Ошибка соединения с сервером. Попробуйте позже.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-serif">
      <div className="w-full max-w-md bg-[#1f1f1f] rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
        <div className="p-8 text-center border-b border-gray-800 bg-black/20">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#FACC15] rounded-xl flex items-center justify-center text-black font-bold text-xl">
              🔔
            </div>
            <span className="text-2xl font-bold text-white">KoloKol</span>
          </Link>
          <h2 className="text-xl font-bold text-white">Вход в систему</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4" autoComplete="off">
          {error && (
            <div className="bg-red-900/30 text-red-400 text-sm p-3 rounded-lg border border-red-900/50">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Введите ваш email"
              className="w-full border border-gray-700 bg-black/50 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#FACC15] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Пароль</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Введите ваш пароль"
              className="w-full border border-gray-700 bg-black/50 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#FACC15] outline-none"
            />
          </div>

          <div className="rounded-lg border border-gray-800 bg-black/30 p-4 space-y-2">
            <p className="text-sm font-semibold text-white">
              KoloKol — единая платформа коммуникаций и автоматизации
            </p>
            <p className="text-sm text-gray-400">
              Голосовые роботы, обзвон, SMS и мессенджеры, Email-рассылки,
              сбор контактов и аналитика в одном личном кабинете.
            </p>
            <p className="text-xs text-gray-500">
              При первом входе система предложит ознакомиться с публичной офертой
              и политикой конфиденциальности. Повторно подтверждать документы
              при каждом входе не требуется.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#FACC15] hover:bg-yellow-400 text-black py-3 rounded-lg font-bold transition disabled:opacity-50 mt-2 shadow-sm"
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}