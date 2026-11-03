"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import {
  createLocalId,
  readLocalJson,
  STORAGE_KEYS,
  writeLocalJson,
  type DemoMessageRecord,
} from "@/lib/demo-mode";

type Contact = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  telegramId?: string;
  status?: string;
  addedAt?: string;
};

type Channel = "sms" | "whatsapp" | "telegram";

const CHANNEL_LABELS: Record<Channel, string> = {
  sms: "SMS / МТТ",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

function isChannel(value: unknown): value is Channel {
  return value === "sms" || value === "whatsapp" || value === "telegram";
}

function isDemoMessageRecord(value: unknown): value is DemoMessageRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<DemoMessageRecord>;
  return (
    typeof record.id === "string" &&
    isChannel(record.channel) &&
    typeof record.recipient === "string" &&
    typeof record.text === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.status === "string"
  );
}

function isContact(value: unknown): value is Contact {
  if (!value || typeof value !== "object") return false;

  const contact = value as Partial<Contact>;
  return typeof contact.id === "string";
}

export default function MessengersPage() {
  const { toast } = useToast();

  const [channel, setChannel] = useState<Channel>("sms");
  const [text, setText] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<DemoMessageRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quickPhone, setQuickPhone] = useState("");

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      const rawContacts = readLocalJson<unknown>(STORAGE_KEYS.contacts, []);
      const validContacts = Array.isArray(rawContacts)
        ? rawContacts.filter(isContact)
        : [];

      const rawHistory = readLocalJson<unknown>(STORAGE_KEYS.messages, []);
      const validHistory = Array.isArray(rawHistory)
        ? rawHistory.filter(isDemoMessageRecord).slice(0, 100)
        : [];

      if (!cancelled) {
        setContacts(validContacts);
        setHistory(validHistory);
        setLoaded(true);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const eligibleContacts = useMemo(() => {
    return contacts.filter((contact) => {
      if (channel === "telegram") {
        return Boolean(contact.telegramId?.trim());
      }

      return Boolean(contact.phone?.trim());
    });
  }, [contacts, channel]);

  const selectedContacts = useMemo(
    () => eligibleContacts.filter((contact) => selectedIds.has(contact.id)),
    [eligibleContacts, selectedIds],
  );

  function toggleContact(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleAllEligible() {
    const allSelected =
      eligibleContacts.length > 0 &&
      eligibleContacts.every((contact) => selectedIds.has(contact.id));

    setSelectedIds((current) => {
      const next = new Set(current);

      if (allSelected) {
        eligibleContacts.forEach((contact) => next.delete(contact.id));
      } else {
        eligibleContacts.forEach((contact) => next.add(contact.id));
      }

      return next;
    });
  }

  function recipientFor(contact: Contact): string {
    return channel === "telegram"
      ? contact.telegramId?.trim() || ""
      : contact.phone?.trim() || "";
  }

  async function handleSimulateSend() {
    if (busy) return;

    const messageText = text.trim();

    if (!messageText) {
      toast("Введи текст сообщения.", "warning");
      return;
    }

    if (selectedContacts.length === 0) {
      toast("Выбери хотя бы один контакт с подходящими данными.", "warning");
      return;
    }

    setBusy(true);

    try {
      const now = new Date().toISOString();

      const records: DemoMessageRecord[] = selectedContacts.map((contact) => ({
        id: createLocalId(),
        channel,
        recipient: recipientFor(contact),
        text: messageText,
        status: "simulated",
        createdAt: now,
        note: "Тестовая запись. Сообщение внешнему провайдеру не отправлялось.",
      }));

      const nextHistory = [...records, ...history].slice(0, 100);

      if (!writeLocalJson(STORAGE_KEYS.messages, nextHistory)) {
        toast(
          "Не удалось сохранить тестовую историю. Проверь настройки браузера.",
          "error",
        );
        return;
      }

      setHistory(nextHistory);
      toast(
        `Создано тестовых записей: ${records.length}. Реальная отправка не выполнялась.`,
        "success",
      );
    } catch {
      toast("Не удалось создать тестовые записи.", "error");
    } finally {
      setBusy(false);
    }
  }

  function clearHistory() {
    if (!window.confirm("Удалить локальную историю тестовых сообщений?")) {
      return;
    }

    if (!writeLocalJson(STORAGE_KEYS.messages, [])) {
      toast("Не удалось очистить историю. Проверь настройки браузера.", "error");
      return;
    }

    setHistory([]);
    toast("История тестовых сообщений очищена.", "success");
  }

  function openTelegramManually() {
    const digits = quickPhone.replace(/\D/g, "");

    if (digits.length < 8 || digits.length > 15) {
      toast("Введи номер телефона длиной от 8 до 15 цифр.", "warning");
      return;
    }

    // Открываем Telegram вручную. Автоматической отправки сообщения нет.
    window.open(
      `https://t.me/+${digits}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (!loaded) {
    return <div className="p-8 text-center text-gray-400">Загрузка…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#FACC15]">
            Сообщения
          </p>
          <h1 className="mt-2 text-3xl font-bold">Рассылки и мессенджеры</h1>
          <p className="mt-2 text-sm text-gray-400">
            Проверка сценариев без подключения платных каналов.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#FACC15] hover:underline"
        >
          ← На дашборд
        </Link>
      </header>

      <section className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="font-semibold text-amber-200">Без реальной отправки</p>
        <p className="mt-1 text-sm text-amber-100/80">
          Кнопка создаёт только локальные записи в тестовой истории. SMS через
          МТТ, WhatsApp и сообщения через Telegram Bot API не отправляются.
          Никакие средства не списываются.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
          <h2 className="text-xl font-bold">Тестовая рассылка</h2>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Канал</label>
            <div className="grid grid-cols-3 gap-2">
              {(["sms", "whatsapp", "telegram"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setChannel(item)}
                  className={`rounded-lg border px-2 py-3 text-sm font-medium ${
                    channel === item
                      ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]"
                      : "border-gray-700 text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  {CHANNEL_LABELS[item]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Текст сообщения
            </label>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="Напиши текст тестового сообщения…"
              className="w-full resize-y rounded-lg border border-gray-700 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#FACC15]"
            />
            <p className="mt-1 text-right text-xs text-gray-500">
              {text.length}/4000
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-sm text-gray-300">
                Получатели с данными для выбранного канала
              </label>
              <button
                type="button"
                onClick={toggleAllEligible}
                disabled={eligibleContacts.length === 0}
                className="text-xs text-[#FACC15] hover:underline disabled:opacity-40"
              >
                Выбрать / снять все
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-700 bg-black/20">
              {eligibleContacts.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">
                  Подходящих контактов нет. Добавь номер телефона или Telegram ID
                  в разделе{" "}
                  <Link
                    href="/dashboard/contacts"
                    className="text-[#FACC15] hover:underline"
                  >
                    «Контакты»
                  </Link>
                  .
                </p>
              ) : (
                eligibleContacts.map((contact) => {
                  const recipient = recipientFor(contact);

                  return (
                    <label
                      key={contact.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-gray-800 px-4 py-3 last:border-0 hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        className="h-4 w-4 accent-[#FACC15]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {contact.name || "Без имени"}
                        </span>
                        <span className="block truncate font-mono text-xs text-gray-400">
                          {recipient}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Выбрано получателей: {selectedContacts.length}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSimulateSend}
            disabled={busy || selectedContacts.length === 0 || !text.trim()}
            className="w-full rounded-lg bg-[#FACC15] px-5 py-3 font-bold text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? "Создание тестовых записей…"
              : "Создать тестовую рассылку"}
          </button>
        </section>

        <aside className="space-y-5">
          <section className="space-y-3 rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
            <h2 className="font-bold">Открыть Telegram вручную</h2>
            <p className="text-sm text-gray-400">
              Можно открыть ссылку на Telegram. Это не отправляет сообщение
              автоматически и не подтверждает, что пользователь доступен.
            </p>
            <label className="block text-sm text-gray-300">
              Номер телефона
              <input
                type="tel"
                value={quickPhone}
                onChange={(event) => setQuickPhone(event.target.value)}
                placeholder="+79991234567"
                className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white outline-none focus:border-[#FACC15]"
              />
            </label>
            <button
              type="button"
              onClick={openTelegramManually}
              className="w-full rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
            >
              Открыть Telegram
            </button>
          </section>

          <section className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
            <h2 className="font-bold">Сводка тестов</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-400">Всего записей</dt>
                <dd className="font-semibold">{history.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-400">SMS / МТТ</dt>
                <dd>
                  {history.filter((item) => item.channel === "sms").length}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-400">Telegram</dt>
                <dd>
                  {history.filter((item) => item.channel === "telegram").length}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-400">WhatsApp</dt>
                <dd>
                  {history.filter((item) => item.channel === "whatsapp").length}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">История тестовых сообщений</h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Очистить
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="rounded-xl border border-gray-800 p-6 text-sm text-gray-500">
            Тестовых сообщений пока нет.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-black/30 text-gray-400">
                <tr>
                  <th className="p-3 font-medium">Время</th>
                  <th className="p-3 font-medium">Канал</th>
                  <th className="p-3 font-medium">Получатель</th>
                  <th className="p-3 font-medium">Текст</th>
                  <th className="p-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id} className="border-t border-gray-800">
                    <td className="whitespace-nowrap p-3 text-gray-400">
                      {new Date(record.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="p-3">{CHANNEL_LABELS[record.channel]}</td>
                    <td className="p-3 font-mono">{record.recipient}</td>
                    <td className="max-w-xs p-3">
                      <span className="block truncate" title={record.text}>
                        {record.text}
                      </span>
                    </td>
                    <td className="p-3 text-amber-300">Симуляция</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}