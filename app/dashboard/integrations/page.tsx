// app/dashboard/integrations/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createLocalId,
  readLocalJson,
  STORAGE_KEYS,
  writeLocalJson,
  type IntegrationType,
  type LocalIntegration,
} from "@/lib/demo-mode";

const TYPE_LABELS: Record<IntegrationType, string> = {
  bitrix24: "Bitrix24",
  amocrm: "amoCRM",
  webhook: "Собственный Webhook",
  sheets: "Google Sheets",
};

const TYPE_MARKS: Record<IntegrationType, string> = {
  bitrix24: "B",
  amocrm: "A",
  webhook: "W",
  sheets: "S",
};

function isIntegrationType(value: unknown): value is IntegrationType {
  return (
    value === "bitrix24" ||
    value === "amocrm" ||
    value === "webhook" ||
    value === "sheets"
  );
}

function safePortalOrigin(value: string): string {
  try {
    const parsed = new URL(value);

    if (
      parsed.protocol !== "https:" &&
      parsed.protocol !== "http:"
    ) {
      return "";
    }

    if (parsed.username || parsed.password) {
      return "";
    }

    return parsed.origin;
  } catch {
    return "";
  }
}

function loadProfiles(): LocalIntegration[] {
  const stored = readLocalJson<unknown>(STORAGE_KEYS.integrations, []);

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.flatMap((item): LocalIntegration[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const value = item as Record<string, unknown>;

    if (!isIntegrationType(value.type)) {
      return [];
    }

    const type = value.type;
    const name =
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim().slice(0, 80)
        : TYPE_LABELS[type];

    const savedPortal =
      typeof value.portalUrl === "string"
        ? safePortalOrigin(value.portalUrl)
        : "";

    return [
      {
        id:
          typeof value.id === "string" && value.id
            ? value.id
            : createLocalId(),
        name,
        type,
        portalUrl: savedPortal,
        isActive: false,
        mode: "demo",
        createdAt:
          typeof value.createdAt === "string"
            ? value.createdAt
            : new Date().toISOString(),
      },
    ];
  });
}

export default function IntegrationsPage() {
  const [profiles, setProfiles] = useState<LocalIntegration[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<IntegrationType>("bitrix24");
  const [portalUrl, setPortalUrl] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const initial = loadProfiles();

      setProfiles(initial);
      writeLocalJson(STORAGE_KEYS.integrations, initial);
      setLoaded(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function persist(next: LocalIntegration[]): boolean {
    if (!writeLocalJson(STORAGE_KEYS.integrations, next)) {
      setNotice(
        "Не удалось сохранить данные в браузере. Проверь настройки хранения сайта.",
      );
      return false;
    }

    setProfiles(next);
    setNotice(
      "Профиль сохранён.",
    );
    return true;
  }

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const trimmedName = name.trim();
    const trimmedUrl = portalUrl.trim();

    if (!trimmedName) {
      setNotice("Введите название профиля.");
      return;
    }

    const normalizedPortal = trimmedUrl
      ? safePortalOrigin(trimmedUrl)
      : "";

    if (trimmedUrl && !normalizedPortal) {
      setNotice(
        "Укажи корректный HTTP(S)-адрес портала без логина и пароля. Не вставляй webhook URL.",
      );
      return;
    }

    const profile: LocalIntegration = {
      id: createLocalId(),
      name: trimmedName.slice(0, 80),
      type,
      portalUrl: normalizedPortal,
      isActive: false,
      mode: "demo",
      createdAt: new Date().toISOString(),
    };

    const nextProfiles = [profile, ...profiles];

    if (!persist(nextProfiles)) {
      return;
    }

    setName("");
    setPortalUrl("");
    setType("bitrix24");
    setShowForm(false);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить профиль?")) {
      return;
    }

    persist(profiles.filter((profile) => profile.id !== id));
  }

  if (!loaded) {
    return <div className="p-8 text-center text-gray-400">Загрузка…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#FACC15]">
            Интеграции
          </p>
          <h1 className="mt-2 text-3xl font-bold">Подключение CRM</h1>
          <p className="mt-2 text-sm text-gray-400">
            Настройка профилей для подключения внешних сервисов.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#FACC15] hover:underline"
        >
          ← На дашборд
        </Link>
      </header>

      {notice && (
        <p
          role="status"
          className="rounded-lg border border-gray-700 bg-black/20 p-3 text-sm text-gray-200"
        >
          {notice}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="rounded-lg bg-[#FACC15] px-4 py-2 font-bold text-black hover:bg-yellow-300"
        >
          {showForm ? "Закрыть форму" : "+ Создать профиль"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="space-y-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6"
        >
          <h2 className="text-lg font-semibold">Новый профиль</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-gray-300">
              Название
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                placeholder="Bitrix24 — отдел продаж"
                className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white outline-none focus:border-[#FACC15]"
              />
            </label>

            <label className="block text-sm text-gray-300">
              Тип системы
              <select
                value={type}
                onChange={(event) => {
                  const value = event.target.value;

                  if (isIntegrationType(value)) {
                    setType(value);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white outline-none focus:border-[#FACC15]"
              >
                <option value="bitrix24">Bitrix24</option>
                <option value="amocrm">amoCRM</option>
                <option value="webhook">Собственный Webhook</option>
                <option value="sheets">Google Sheets</option>
              </select>
            </label>

            <label className="block text-sm text-gray-300 md:col-span-2">
              Адрес портала (необязательно)
              <input
                type="url"
                value={portalUrl}
                onChange={(event) => setPortalUrl(event.target.value)}
                placeholder="https://company.bitrix24.ru"
                className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white outline-none focus:border-[#FACC15]"
              />
              <span className="mt-1 block text-xs text-gray-500">
                Сохранится только адрес сайта, без пути и параметров.
                Не вставляй сюда webhook URL, токены или пароли.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-700 px-4 py-2 text-gray-300 hover:bg-gray-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#FACC15] px-4 py-2 font-bold text-black hover:bg-yellow-300"
            >
              Сохранить
            </button>
          </div>
        </form>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-gray-700 p-10 text-center">
            <p className="text-gray-300">Профилей пока нет.</p>
            <p className="mt-2 text-sm text-gray-500">
              Создай профиль Bitrix24 для подключения.
            </p>
          </div>
        ) : (
          profiles.map((profile) => (
            <article
              key={profile.id}
              className="flex flex-col rounded-xl border border-gray-800 bg-[#1f1f1f] p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-xl font-bold text-[#FACC15]">
                  {TYPE_MARKS[profile.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-bold">{profile.name}</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {TYPE_LABELS[profile.type]}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex-1 rounded-lg bg-black/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Адрес портала
                </p>
                <p className="mt-1 break-all text-sm text-gray-300">
                  {profile.portalUrl || "Не указан"}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-3">
                <span className="text-xs text-gray-500">
                  Создано:{" "}
                  {new Date(profile.createdAt).toLocaleDateString("ru-RU")}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(profile.id)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Удалить
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}