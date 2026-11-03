"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

type Contact = {
id: string;
phone: string;
email?: string;
telegramId?: string;
status: string;
addedAt: string;
};

type EmailReport = {
id: string;
subject: string;
date: string;
total: number;
sent: number;
failed: number;
};

type EmailStats = {
total: number;
sent: number;
failed: number;
};

type SendResponse = {
total: number;
sent: number;
failed: number;
error?: string;
};

const CONTACTS_STORAGE_KEY = "voicepilot_contacts";
const EMAIL_HISTORY_KEY = "voicepilot_email_history";

function isRecord(value: unknown): value is Record<string, unknown> {
return typeof value === "object" && value !== null;
}

function isContact(value: unknown): value is Contact {
if (!isRecord(value)) {
return false;
}

  return (
typeof value.id === "string" &&
typeof value.phone === "string" &&
typeof value.status === "string" &&
typeof value.addedAt === "string" &&
(value.email === undefined || typeof value.email === "string") &&
(value.telegramId === undefined ||
typeof value.telegramId === "string")
);
}

function isEmailReport(value: unknown): value is EmailReport {
if (!isRecord(value)) {
return false;
}

  return (
typeof value.id === "string" &&
typeof value.subject === "string" &&
typeof value.date === "string" &&
typeof value.total === "number" &&
typeof value.sent === "number" &&
typeof value.failed === "number"
);
}

function isSendResponse(value: unknown): value is SendResponse {
if (!isRecord(value)) {
return false;
}

  return (
typeof value.total === "number" &&
typeof value.sent === "number" &&
typeof value.failed === "number" &&
(value.error === undefined || typeof value.error === "string")
);
}

function loadEmailContacts(): Contact[] {
try {
const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
if (!raw) {
  return [];
}

const parsed: unknown = JSON.parse(raw);

if (!Array.isArray(parsed)) {
  return [];
}

return parsed.filter(isContact).filter(
  (contact) =>
    typeof contact.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email),
);


  } catch (error) {
console.error("Ошибка загрузки контактов", error);
return [];
}
}

function saveEmailReport(report: EmailReport): boolean {
try {
const raw = localStorage.getItem(EMAIL_HISTORY_KEY);
let history: EmailReport[] = [];
if (raw) {
  const parsed: unknown = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    history = parsed.filter(isEmailReport);
  }
}

localStorage.setItem(
  EMAIL_HISTORY_KEY,
  JSON.stringify([report, ...history]),
);

return true;


  } catch (error) {
console.error("Ошибка сохранения истории email", error);
return false;
}
}

export default function EmailPage() {
const { toast } = useToast();

  const [subject, setSubject] = useState("");
const [body, setBody] = useState("");
const [isSending, setIsSending] = useState(false);
const [contacts, setContacts] = useState<Contact[]>([]);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [stats, setStats] = useState<EmailStats>({
total: 0,
sent: 0,
failed: 0,
});

  useEffect(() => {
const timer = window.setTimeout(() => {
setContacts(loadEmailContacts());
}, 0);
return () => {
  window.clearTimeout(timer);
};


  }, []);

  const toggleContact = (id: string): void => {
setSelectedIds((previous) => {
const next = new Set(previous);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
});


  };

  const toggleAll = (): void => {
if (contacts.length === 0) {
setSelectedIds(new Set());
return;
}
if (selectedIds.size === contacts.length) {
  setSelectedIds(new Set());
} else {
  setSelectedIds(new Set(contacts.map((contact) => contact.id)));
}


  };

  const handleSend = async (): Promise<void> => {
if (!subject.trim() || !body.trim()) {
toast("Заполните тему и текст письма", "warning");
return;
}
const selectedContacts = contacts
  .filter((contact) => selectedIds.has(contact.id))
  .filter(
    (contact): contact is Contact & { email: string } =>
      typeof contact.email === "string" && contact.email.length > 0,
  );

if (selectedContacts.length === 0) {
  toast("Выберите хотя бы один контакт с email", "warning");
  return;
}

setIsSending(true);
setStats({ total: 0, sent: 0, failed: 0 });

try {
  const response = await fetch("/api/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: subject.trim(),
      body: body.trim(),
      contacts: selectedContacts.map((contact) => ({
        email: contact.email,
      })),
    }),
  });

  let responseData: unknown;

  try {
    responseData = await response.json();
  } catch {
    toast("Сервер вернул некорректный ответ", "error");
    return;
  }

  if (!isRecord(responseData)) {
    toast("Сервер вернул некорректный ответ", "error");
    return;
  }

  if (!response.ok) {
    const errorMessage =
      typeof responseData.error === "string"
        ? responseData.error
        : "Ошибка отправки";

    toast(errorMessage, "error");
    return;
  }

  if (!isSendResponse(responseData)) {
    toast("Сервер вернул некорректные данные о рассылке", "error");
    return;
  }

  const data = responseData;

  const nextStats: EmailStats = {
    total: data.total,
    sent: data.sent,
    failed: data.failed,
  };

  setStats(nextStats);

  const report: EmailReport = {
    id: Date.now().toString(36),
    subject: subject.trim(),
    date: new Date().toLocaleString("ru-RU"),
    total: data.total,
    sent: data.sent,
    failed: data.failed,
  };

  saveEmailReport(report);

  toast(
    `Рассылка завершена. Отправлено: ${data.sent}, Ошибок: ${data.failed}`,
    data.failed > 0 ? "warning" : "success",
  );

  // Перезагрузка сохраняет прежнее поведение страницы
  // для обновления баланса после отправки.
  window.setTimeout(() => {
    window.location.reload();
  }, 1500);
} catch (error) {
  console.error("Ошибка отправки email-рассылки", error);
  toast("Ошибка соединения с сервером", "error");
} finally {
  setIsSending(false);
}


  };

  const allSelected =
contacts.length > 0 && selectedIds.size === contacts.length;

  return (
<div className="space-y-6">
<div className="flex justify-between items-center">
<div>
<h2 className="text-2xl font-bold text-white">
Email-рассылки
</h2>
<p className="text-sm text-gray-400">
Отправка писем по вашей базе контактов
</p>
</div>
    <Link
      href="/dashboard"
      className="text-sm text-[#FACC15] hover:text-yellow-400 font-medium"
    >
      ← На дашборд
    </Link>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">
        Новое письмо
      </h3>

      <div>
        <label
          htmlFor="email-subject"
          className="block text-sm text-gray-300 mb-1"
        >
          Тема письма
        </label>

        <input
          id="email-subject"
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Например: Специальное предложение"
          className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
        />
      </div>

      <div>
        <label
          htmlFor="email-body"
          className="block text-sm text-gray-300 mb-1"
        >
          Текст письма
        </label>

        <textarea
          id="email-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          placeholder="Введите текст сообщения..."
          className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#FACC15] resize-y"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm text-gray-300">
            Получатели
          </label>

          <button
            type="button"
            onClick={toggleAll}
            disabled={contacts.length === 0 || isSending}
            className="text-xs text-[#FACC15] hover:text-yellow-400 disabled:opacity-50"
          >
            {allSelected ? "Снять все" : "Выбрать все"}
          </button>
        </div>

        <div className="border border-gray-700 rounded-lg max-h-48 overflow-y-auto bg-black/30">
          {contacts.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">
              Нет контактов с email.
            </p>
          ) : (
            contacts.map((contact) => (
              <label
                key={contact.id}
                className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 last:border-0 hover:bg-white/5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(contact.id)}
                  onChange={() => toggleContact(contact.id)}
                  disabled={isSending}
                  className="w-4 h-4 accent-[#FACC15]"
                />

                <span className="text-sm font-mono text-gray-300">
                  {contact.email}
                </span>
              </label>
            ))
          )}
        </div>

        <p className="text-xs text-gray-500 mt-1">
          Выбрано:{" "}
          {
            contacts.filter((contact) =>
              selectedIds.has(contact.id),
            ).length
          }
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || selectedIds.size === 0}
          className="bg-[#FACC15] hover:bg-yellow-400 text-black px-6 py-2 rounded-lg font-bold transition disabled:opacity-50"
        >
          {isSending
            ? "Отправка..."
            : `Отправить (${selectedIds.size})`}
        </button>
      </div>
    </div>

    <div className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 h-fit">
      <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2 mb-4">
        Результат
      </h3>

      <div className="space-y-3">
        <div className="bg-black/30 p-3 rounded-lg flex justify-between">
          <span className="text-gray-400">Всего выбрано</span>
          <span className="font-bold text-white">{stats.total}</span>
        </div>

        <div className="bg-black/30 p-3 rounded-lg flex justify-between">
          <span className="text-gray-400">Отправлено</span>
          <span className="font-bold text-green-400">{stats.sent}</span>
        </div>

        <div className="bg-black/30 p-3 rounded-lg flex justify-between">
          <span className="text-gray-400">Ошибок</span>
          <span className="font-bold text-red-400">{stats.failed}</span>
        </div>
      </div>
    </div>
  </div>
</div>


  );
}