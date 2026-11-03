"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

type ParseResponse = {
  emails?: unknown;
  phones?: unknown;
  error?: unknown;
};

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ).map((item) => item.trim()),
    ),
  );
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ParserPage() {
  const { toast } = useToast();
  const [parseUrl, setParseUrl] = useState("");
  const [legalAgreed, setLegalAgreed] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [parsedPhones, setParsedPhones] = useState<string[]>([]);

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());

  const [isSaving, setIsSaving] = useState<"emails" | "phones" | null>(null);

  const handleParse = async () => {
    if (isParsing) return;

    const url = parseUrl.trim();
    if (!url) {
      toast("Введите URL", "warning");
      return;
    }

    if (!isValidHttpUrl(url)) {
      toast("Введите корректный URL с http:// или https://", "warning");
      return;
    }

    if (!legalAgreed) {
      toast("Подтвердите согласие", "warning");
      return;
    }

    setIsParsing(true);
    setParsedEmails([]);
    setParsedPhones([]);
    setSelectedEmails(new Set());
    setSelectedPhones(new Set());

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data: ParseResponse = await res.json().catch(() => ({}));

      if (res.ok) {
        const emails = normalizeStringList(data.emails);
        const phones = normalizeStringList(data.phones);

        setParsedEmails(emails);
        setParsedPhones(phones);
        setSelectedEmails(new Set(emails));
        setSelectedPhones(new Set(phones));
        toast(
          `Найдено: ${emails.length} email и ${phones.length} телефонов`,
          "success",
        );
      } else {
        toast(
          typeof data.error === "string" ? data.error : "Ошибка парсинга",
          "error",
        );
      }
    } catch {
      toast("Ошибка соединения", "error");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSavePhones = async () => {
    if (isSaving) return;

    if (selectedPhones.size === 0) {
      toast("Выберите телефоны", "warning");
      return;
    }

    setIsSaving("phones");

    try {
      const raw = localStorage.getItem("voicepilot_contacts");
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const contacts: Array<Record<string, unknown>> = Array.isArray(parsed)
        ? parsed.filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === "object" && !Array.isArray(item),
          )
        : [];

      const existing = new Set(
        contacts
          .map((contact) => contact.phone)
          .filter((phone): phone is string => typeof phone === "string"),
      );

      let added = 0;

      selectedPhones.forEach((phone) => {
        if (!existing.has(phone)) {
          existing.add(phone);
          contacts.push({
            id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
            phone,
            status: "new",
            addedAt: new Date().toISOString(),
          });
          added += 1;
        }
      });

      localStorage.setItem("voicepilot_contacts", JSON.stringify(contacts));
      toast(`Добавлено ${added} телефонов`, "success");

      setParsedPhones((current) => current.filter((phone) => !selectedPhones.has(phone)));
      setSelectedPhones(new Set());
    } catch {
      toast("Ошибка сохранения. Проверь данные контактов и настройки браузера.", "error");
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveEmails = async () => {
    if (isSaving) return;

    if (selectedEmails.size === 0) {
      toast("Выберите email", "warning");
      return;
    }

    setIsSaving("emails");

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-emails",
          data: Array.from(selectedEmails),
        }),
      });

      const data: ParseResponse = await res.json().catch(() => ({}));

      if (res.ok) {
        toast("Email сохранены в базе данных", "success");
        setParsedEmails((current) => current.filter((email) => !selectedEmails.has(email)));
        setSelectedEmails(new Set());
      } else {
        toast(
          typeof data.error === "string" ? data.error : "Ошибка сохранения email",
          "error",
        );
      }
    } catch {
      toast("Ошибка соединения", "error");
    } finally {
      setIsSaving(null);
    }
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const togglePhone = (phone: string) => {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const removeEmail = (email: string) => {
    setParsedEmails((current) => current.filter((item) => item !== email));
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      next.delete(email);
      return next;
    });
  };

  const removePhone = (phone: string) => {
    setParsedPhones((current) => current.filter((item) => item !== phone));
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      next.delete(phone);
      return next;
    });
  };

  const toggleAllEmails = () => {
    setSelectedEmails(
      selectedEmails.size === parsedEmails.length
        ? new Set()
        : new Set(parsedEmails),
    );
  };

  const toggleAllPhones = () => {
    setSelectedPhones(
      selectedPhones.size === parsedPhones.length
        ? new Set()
        : new Set(parsedPhones),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Парсинг контактов</h2>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#FACC15] hover:text-yellow-400"
        >
          ← На дашборд
        </Link>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            Сбор контактов с сайта
          </h3>
          <p className="mb-4 text-sm text-gray-400">
            Введите URL страницы. Мы извлечём email-адреса и телефоны.
          </p>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleParse();
            }}
          >
            <input
              type="url"
              value={parseUrl}
              onChange={(event) => setParseUrl(event.target.value)}
              placeholder="https://example.com/contacts"
              aria-label="URL страницы для парсинга"
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-black/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
            <button
              type="submit"
              disabled={isParsing || isSaving !== null}
              className="whitespace-nowrap rounded-lg bg-[#FACC15] px-6 py-2 font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50"
            >
              {isParsing ? "Парсинг..." : "🔍 Найти"}
            </button>
          </form>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-800 bg-blue-900/20 p-3 text-xs text-blue-300">
            <span aria-hidden="true">⚖️</span>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={legalAgreed}
                onChange={(event) => setLegalAgreed(event.target.checked)}
                className="mt-0.5 accent-[#FACC15]"
              />
              <span>
                Я подтверждаю, что имею законные основания для сбора данных и
                соблюдаю применимые требования законодательства о персональных
                данных, включая 152-ФЗ, если он применим.
              </span>
            </label>
          </div>
        </div>
      </div>

      {parsedEmails.length > 0 && (
        <div className="space-y-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
          <div className="flex items-center justify-between gap-3 border-b border-gray-800 pb-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                aria-label="Выбрать все email"
                checked={
                  selectedEmails.size === parsedEmails.length &&
                  parsedEmails.length > 0
                }
                onChange={toggleAllEmails}
                className="h-4 w-4 accent-[#FACC15]"
              />
              <h3 className="text-lg font-semibold text-white">
                Email-адреса ({parsedEmails.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={handleSaveEmails}
              disabled={isSaving !== null || selectedEmails.size === 0}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
            >
              {isSaving === "emails"
                ? "Сохранение..."
                : `➕ Добавить (${selectedEmails.size})`}
            </button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {parsedEmails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between rounded p-2 transition hover:bg-white/5"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedEmails.has(email)}
                    onChange={() => toggleEmail(email)}
                    className="h-4 w-4 accent-[#FACC15]"
                  />
                  <span className="break-all font-mono text-sm text-gray-300">
                    {email}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  aria-label={`Удалить ${email} из результатов`}
                  className="p-1 text-xs text-red-400 hover:text-red-300"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedPhones.length > 0 && (
        <div className="space-y-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
          <div className="flex items-center justify-between gap-3 border-b border-gray-800 pb-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                aria-label="Выбрать все телефоны"
                checked={
                  selectedPhones.size === parsedPhones.length &&
                  parsedPhones.length > 0
                }
                onChange={toggleAllPhones}
                className="h-4 w-4 accent-[#FACC15]"
              />
              <h3 className="text-lg font-semibold text-white">
                Телефоны ({parsedPhones.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={handleSavePhones}
              disabled={isSaving !== null || selectedPhones.size === 0}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
            >
              {isSaving === "phones"
                ? "Сохранение..."
                : `➕ Добавить (${selectedPhones.size})`}
            </button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {parsedPhones.map((phone) => (
              <div
                key={phone}
                className="flex items-center justify-between rounded p-2 transition hover:bg-white/5"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedPhones.has(phone)}
                    onChange={() => togglePhone(phone)}
                    className="h-4 w-4 accent-[#FACC15]"
                  />
                  <span className="break-all font-mono text-sm text-gray-300">
                    {phone}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => removePhone(phone)}
                  aria-label={`Удалить ${phone} из результатов`}
                  className="p-1 text-xs text-red-400 hover:text-red-300"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedEmails.length === 0 &&
        parsedPhones.length === 0 &&
        !isParsing && (
          <div className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-8 text-center">
            <p className="text-gray-500">
              Введите URL и нажмите «Найти», чтобы увидеть результаты.
            </p>
          </div>
        )}
    </div>
  );
}