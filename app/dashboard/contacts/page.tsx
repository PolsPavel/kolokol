"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

type ContactStatus = "new" | "called" | "interested" | "refused";
type StatusFilter = "all" | ContactStatus;

type Contact = {
  id: string;
  phone: string;
  telegramId?: string;
  email?: string;
  status: ContactStatus;
  addedAt: string;
};

const STORAGE_KEY = "voicepilot_contacts";

function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item: unknown): item is Contact => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        const contact = item as Record<string, unknown>;

        return (
          typeof contact.id === "string" &&
          typeof contact.phone === "string" &&
          typeof contact.status === "string" &&
          ["new", "called", "interested", "refused"].includes(
            contact.status,
          ) &&
          typeof contact.addedAt === "string" &&
          (contact.email === undefined ||
            typeof contact.email === "string") &&
          (contact.telegramId === undefined ||
            typeof contact.telegramId === "string")
        );
      },
    );
  } catch {
    return [];
  }
}

function saveContacts(contacts: Contact[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch (error) {
    console.error("Не удалось сохранить контакты:", error);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function extractPhones(text: string): string[] {
  const candidates = text
    .split(/[\s,;|\n\r\t]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const result: string[] = [];

  for (const token of candidates) {
    const cleaned = token.replace(/[^\d+]/g, "");

    if (!cleaned) {
      continue;
    }

    const digitsOnly = cleaned.replace(/\D/g, "");

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      continue;
    }

    let normalized = cleaned;

    if (normalized.startsWith("+")) {
      // Номер уже содержит международный префикс.
    } else if (normalized.startsWith("8") && digitsOnly.length === 11) {
      normalized = "+7" + digitsOnly.slice(1);
    } else if (normalized.startsWith("7") && digitsOnly.length === 11) {
      normalized = "+" + digitsOnly;
    } else if (digitsOnly.length === 10) {
      normalized = "+7" + digitsOnly;
    }

    result.push(normalized);
  }

  return Array.from(new Set(result));
}

export default function ContactsPage() {
  const { toast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [inputPhones, setInputPhones] = useState("");
  const [inputEmails, setInputEmails] = useState("");
  const [inputTgId, setInputTgId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setContacts(loadContacts());
      setIsLoaded(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const persist = (updated: Contact[]): void => {
    saveContacts(updated);
    setContacts(updated);
  };

  const handleAdd = (): void => {
    if (
      !inputPhones.trim() &&
      !inputEmails.trim() &&
      !inputTgId.trim()
    ) {
      toast("Введите телефон, email или Telegram ID", "warning");
      return;
    }

    const now = new Date().toLocaleString("ru-RU");
    const fresh: Contact[] = [];

    const phones = extractPhones(inputPhones);

    for (const phone of phones) {
      fresh.push({
        id: generateId(),
        phone,
        email: inputEmails.trim() || undefined,
        telegramId: inputTgId.trim() || undefined,
        status: "new",
        addedAt: now,
      });
    }

    if (phones.length === 0 && inputEmails.trim()) {
      const emails = inputEmails
        .split(/[\s,;]+/)
        .map((email) => email.trim())
        .filter((email) => email.includes("@"));

      for (const email of emails) {
        fresh.push({
          id: generateId(),
          phone: "",
          email,
          telegramId: inputTgId.trim() || undefined,
          status: "new",
          addedAt: now,
        });
      }
    }

    if (
      phones.length === 0 &&
      !inputEmails.trim() &&
      inputTgId.trim()
    ) {
      fresh.push({
        id: generateId(),
        phone: "",
        telegramId: inputTgId.trim(),
        status: "new",
        addedAt: now,
      });
    }

    if (fresh.length === 0) {
      toast("Не удалось распознать данные", "warning");
      return;
    }

    persist([...contacts, ...fresh]);

    setInputPhones("");
    setInputEmails("");
    setInputTgId("");

    toast(`Добавлено ${fresh.length} новых контактов`, "success");
  };

  const handleDelete = (id: string): void => {
    if (!window.confirm("Удалить контакт?")) {
      return;
    }

    persist(contacts.filter((contact) => contact.id !== id));
  };

  const filtered = contacts.filter((contact) => {
    const matchesSearch =
      !search ||
      contact.phone.includes(search) ||
      (contact.email?.includes(search) ?? false) ||
      (contact.telegramId?.includes(search) ?? false);

    const matchesStatus =
      statusFilter === "all" || contact.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!isLoaded) {
    return (
      <div className="p-8 text-center text-gray-400">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">
          База контактов
        </h2>

        <Link
          href="/dashboard"
          className="text-sm text-[#FACC15] hover:text-yellow-400 font-medium"
        >
          ← На дашборд
        </Link>
      </div>

      <div className="bg-[#1f1f1f] rounded-xl border border-gray-800 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Добавить контакты
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Телефоны (списком)
            </label>

            <textarea
              value={inputPhones}
              onChange={(event) => setInputPhones(event.target.value)}
              rows={3}
              placeholder="+7 999 123-45-67..."
              className="w-full px-4 py-3 border border-gray-700 bg-black/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#FACC15] outline-none resize-y font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Email (списком)
            </label>

            <textarea
              value={inputEmails}
              onChange={(event) => setInputEmails(event.target.value)}
              rows={3}
              placeholder="client@example.com..."
              className="w-full px-4 py-3 border border-gray-700 bg-black/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#FACC15] outline-none resize-y font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Telegram ID
            </label>

            <input
              value={inputTgId}
              onChange={(event) => setInputTgId(event.target.value)}
              placeholder="Например: 5440934218"
              className="w-full px-4 py-3 border border-gray-700 bg-black/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#FACC15] outline-none font-mono text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            className="px-5 py-2.5 bg-[#FACC15] text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
          >
            Добавить контакты
          </button>
        </div>
      </div>

      <div className="bg-[#1f1f1f] rounded-xl border border-gray-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">
            Список контактов ({filtered.length})
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по телефону, email или Telegram"
              className="w-full sm:w-72 px-4 py-2 border border-gray-700 bg-black/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#FACC15] outline-none text-sm"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="px-3 py-2 border border-gray-700 bg-black/50 rounded-lg text-white focus:ring-2 focus:ring-[#FACC15] outline-none text-sm"
            >
              <option value="all">Все статусы</option>
              <option value="new">Новые</option>
              <option value="called">Обзвонены</option>
              <option value="interested">Заинтересованы</option>
              <option value="refused">Отказались</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            {contacts.length === 0
              ? "Контактов пока нет. Добавьте первые контакты выше."
              : "По заданным условиям контакты не найдены."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Telegram ID</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Дата добавления</th>
                  <th className="px-4 py-3 font-medium">Действия</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-gray-800/70 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 text-white whitespace-nowrap">
                      {contact.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {contact.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {contact.telegramId || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={contact.status}
                        onChange={(event) => {
                          const status = event.target.value as ContactStatus;

                          persist(
                            contacts.map((item) =>
                              item.id === contact.id
                                ? { ...item, status }
                                : item,
                            ),
                          );
                        }}
                        aria-label={`Статус контакта ${contact.phone || contact.email || contact.telegramId || contact.id}`}
                        className="px-2 py-1 border border-gray-700 bg-black rounded-md text-white text-xs focus:ring-2 focus:ring-[#FACC15] outline-none"
                      >
                        <option value="new">Новый</option>
                        <option value="called">Обзвонен</option>
                        <option value="interested">Заинтересован</option>
                        <option value="refused">Отказался</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {contact.addedAt}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(contact.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}