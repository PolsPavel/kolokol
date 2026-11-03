"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";

export default function SettingsPage() {
  const { data: session, update, status } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sessionName = session?.user?.name;
  const sessionEmail = session?.user?.email;

  useEffect(() => {
    setName(sessionName || "");
    setEmail(sessionEmail || "");
  }, [sessionName, sessionEmail]);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast("Введите имя", "warning");
      return;
    }

    if (trimmedName.length > 120) {
      toast("Имя не должно превышать 120 символов", "warning");
      return;
    }

    if (isSaving) return;

    setIsSaving(true);

    try {
      // Обновляет сессию. Для постоянного сохранения имени
      // в базе данных потребуется отдельный серверный API.
      const updatedSession = await update({ name: trimmedName });

      if (!updatedSession) {
        throw new Error("Не удалось обновить сессию.");
      }

      setName(trimmedName);
      toast(
        "Имя обновлено в сессии. Для постоянного сохранения профиля нужен API.",
        "success",
      );
    } catch (error) {
      console.error("Ошибка обновления профиля:", error);
      toast("Ошибка сохранения настроек", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Настройки</h2>

        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#FACC15] hover:text-yellow-400"
        >
          ← На дашборд
        </Link>
      </div>

      <div className="max-w-2xl space-y-6 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
        <div>
          <h3 className="mb-4 border-b border-gray-800 pb-2 text-lg font-semibold text-white">
            Профиль
          </h3>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-1 block text-sm text-gray-300"
              >
                Имя и фамилия
              </label>

              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                autoComplete="name"
                className="w-full rounded-lg border border-gray-700 bg-black/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-1 block text-sm text-gray-300"
              >
                Email (логин)
              </label>

              <input
                id="profile-email"
                type="email"
                value={email}
                disabled
                autoComplete="email"
                className="w-full cursor-not-allowed rounded-lg border border-gray-800 bg-black/20 px-4 py-2 text-gray-500"
              />

              <p className="mt-1 text-xs text-gray-500">
                Email нельзя изменить. Обратитесь к администратору.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-800 pt-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-lg bg-[#FACC15] px-6 py-2 font-bold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}