// app/dashboard/parser/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

type ParseResult = {
  url: string;
  title: string;
  emails: string[];
  phones: string[];
};

export default function ParserPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(10);
  const [isParsing, setIsParsing] = useState(false);
  const [results, setResults] = useState<ParseResult[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleParse = async () => {
    if (!query.trim()) { toast("Введите поисковый запрос", "warning"); return; }
    setIsParsing(true); setResults([]); setProcessedCount(0);
    try {
      const res = await fetch("/api/parse-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Ошибка парсинга", "error"); return; }
      setResults(data.results || []);
      setProcessedCount(data.processed || 0);
      if (data.message) {
        toast(data.message, "warning");
      } else {
        toast(`Обработано сайтов: ${data.processed || 0}, найдено контактов: ${data.results?.length || 0}`, "success");
      }
    } catch { toast("Ошибка соединения", "error"); } finally { setIsParsing(false); }
  };

  const handleSaveToContacts = async () => {
    if (results.length === 0) return;
    setIsSaving(true);

    try {
      const newContacts: any[] = [];
      const existingRaw = localStorage.getItem("voicepilot_contacts");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const existingPhones = new Set(existing.map((c: any) => c.phone).filter(Boolean));
      const existingEmails = new Set(existing.map((c: any) => c.email).filter(Boolean));

      let addedPhones = 0;
      let addedEmails = 0;
      let duplicates = 0;

      for (const r of results) {
        for (const phone of r.phones) {
          if (existingPhones.has(phone)) {
            duplicates++;
            continue;
          }
          newContacts.push({
            id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
            phone,
            status: "new",
            addedAt: new Date().toISOString(),
            name: r.title,
          });
          existingPhones.add(phone);
          addedPhones++;
        }
        for (const email of r.emails) {
          if (existingEmails.has(email)) {
            duplicates++;
            continue;
          }
          newContacts.push({
            id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
            phone: "",
            email,
            status: "new",
            addedAt: new Date().toISOString(),
            name: r.title,
          });
          existingEmails.add(email);
          addedEmails++;
        }
      }

      if (newContacts.length === 0) {
        toast(`Все ${duplicates} контактов уже есть в базе.`, "info");
        return;
      }

      const updated = [...existing, ...newContacts];
      localStorage.setItem("voicepilot_contacts", JSON.stringify(updated));

      toast(
        `Добавлено: ${addedPhones} телефонов, ${addedEmails} email. Пропущено дубликатов: ${duplicates}.`,
        "success"
      );
    } catch (e) {
      console.error(e);
      toast("Ошибка сохранения", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const totalContacts = results.reduce((acc, r) => acc + r.phones.length + r.emails.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Парсинг контактов</h2>
        <Link href="/dashboard" className="text-sm font-medium text-[#FACC15] hover:text-yellow-400">← На дашборд</Link>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
        <h3 className="mb-2 text-lg font-semibold text-white">Поиск контактов</h3>
        <p className="mb-4 text-sm text-gray-400">Введите запрос (например, "стоматология москва"). Мы найдем сайты и извлечем контакты.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="стоматология москва"
            className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-black/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
          />
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-lg border border-gray-700 bg-black/50 px-4 py-2 text-white">
            <option value={5}>5 сайтов</option>
            <option value={10}>10 сайтов</option>
            <option value={20}>20 сайтов</option>
            <option value={50}>50 сайтов</option>
          </select>
          <button onClick={handleParse} disabled={isParsing} className="whitespace-nowrap rounded-lg bg-[#FACC15] px-6 py-2 font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50">
            {isParsing ? "Поиск..." : "🔍 Найти"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">
              Обработано сайтов: <span className="text-white font-medium">{processedCount}</span>, найдено контактов: <span className="text-[#FACC15] font-medium">{totalContacts}</span>
            </p>
            <button
              onClick={handleSaveToContacts}
              disabled={isSaving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"
            >
              {isSaving ? "Сохранение..." : `+ Сохранить ${totalContacts} контактов с ${results.length} сайтов`}
            </button>
          </div>

          {results.map((r, idx) => (
            <div key={idx} className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
              <h4 className="font-semibold text-white">{r.title}</h4>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#FACC15] hover:underline">{r.url}</a>
              {r.phones.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500">Телефоны:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {r.phones.map((p) => (<span key={p} className="bg-black/50 px-2 py-1 rounded text-sm text-gray-300 font-mono">{p}</span>))}
                  </div>
                </div>
              )}
              {r.emails.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500">Email:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {r.emails.map((e) => (<span key={e} className="bg-black/50 px-2 py-1 rounded text-sm text-gray-300 font-mono">{e}</span>))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !isParsing && processedCount > 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-8 text-center">
          <p className="text-gray-500">Обработано сайтов: {processedCount}, но контактов не найдено.</p>
        </div>
      )}

      {results.length === 0 && !isParsing && processedCount === 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-8 text-center">
          <p className="text-gray-500">Введите запрос и нажмите «Найти», чтобы увидеть результаты.</p>
        </div>
      )}
    </div>
  );
}