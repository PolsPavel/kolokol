// app/dashboard/campaigns/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

type Contact = { id: string; phone: string; status?: string; addedAt?: string; name?: string };
type AudioRoll = { id: string; name: string; text?: string; voice?: string; createdAt?: string };
type Robot = { id: string; name: string; audioDataUrl?: string; textContent?: string; sourceType?: "audio" | "text" };
type SipNumber = { id: string; phone: string; isActive: boolean; callerId: string };
type Outcome = "interested" | "refused" | "callback" | "no_answer";
type CallResult = { contactId: string; phone: string; outcome: Outcome; duration: number; attempts: number; source?: "demo" };
type Scenario = { id: string; actionType: "digits" | "words"; actionValue: string; reactionType: "redirect" | "stop_list" | "play_audio"; redirectNumber?: string; audioRollId?: string };

type Campaign = {
  id: string;
  name: string;
  audioId: string;
  audioName: string;
  sipId?: string;
  sipNumber?: string;
  contactIds: string[];
  status: "draft" | "running" | "completed";
  mode?: "demo";
  createdAt: string;
  completedAt?: string;
  results: CallResult[];
  log?: string[];
  settings: {
    maxAttempts: number;
    retryInterval: number;
    repeatAudioCount: number;
    pauseBetweenRepeats: number;
    considerSuccessfulSeconds: number;
    startTime: string;
    endTime: string;
    weekdays: number[];
  };
  scenarios: Scenario[];
};

const KEYS = {
  campaigns: "voicepilot_campaigns",
  contacts: "voicepilot_contacts",
  audio: "voicepilot_audio_rolls",
  robots: "voicepilot_robots",
  sip: "voicepilot_sip_numbers",
};

const OUTCOME_LABELS: Record<Outcome, string> = {
  interested: "Заинтересован",
  refused: "Отказ",
  callback: "Перезвонить",
  no_answer: "Не ответил",
};

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asCampaigns(value: unknown): Campaign[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Campaign =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            Array.isArray(item.contactIds),
        ),
    )
    .map((item) => ({
      ...item,
      status: item.status === "running" ? "draft" : item.status,
      results: Array.isArray(item.results) ? item.results : [],
      log: Array.isArray(item.log) ? item.log : [],
      scenarios: Array.isArray(item.scenarios) ? item.scenarios : [],
      settings:
        item.settings ||
        {
          maxAttempts: 1,
          retryInterval: 60,
          repeatAudioCount: 1,
          pauseBetweenRepeats: 5,
          considerSuccessfulSeconds: 5,
          startTime: "09:00",
          endTime: "18:00",
          weekdays: [1, 2, 3, 4, 5],
        },
    }));
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [audios, setAudios] = useState<AudioRoll[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [sipNumbers, setSipNumbers] = useState<SipNumber[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [audioId, setAudioId] = useState("");
  const [sipId, setSipId] = useState("");
  const [contactMode, setContactMode] = useState<"all" | "new" | "manual">("new");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [retryInterval, setRetryInterval] = useState(120);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextCampaigns = asCampaigns(loadJson<unknown>(KEYS.campaigns, []));
      setCampaigns(nextCampaigns);
      saveJson(KEYS.campaigns, nextCampaigns);
      setContacts(loadJson<Contact[]>(KEYS.contacts, []));
      setAudios(loadJson<AudioRoll[]>(KEYS.audio, []));
      setRobots(loadJson<Robot[]>(KEYS.robots, []));

      const rawNumbers = loadJson<unknown>(KEYS.sip, []);
      const numbers: SipNumber[] = Array.isArray(rawNumbers)
        ? rawNumbers.filter(
            (n): n is SipNumber =>
              Boolean(
                n &&
                  typeof n === "object" &&
                  typeof n.id === "string" &&
                  typeof n.phone === "string" &&
                  typeof n.isActive === "boolean" &&
                  typeof n.callerId === "string",
              ),
          )
        : [];

      setSipNumbers(numbers);
      const active = numbers.find((number) => number.isActive);
      if (active) setSipId(active.id);
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const availableContacts = useMemo(() => {
    if (contactMode === "all") return contacts;
    if (contactMode === "new") {
      return contacts.filter((contact) => contact.status === "new");
    }
    return contacts.filter((contact) => selectedContacts.has(contact.id));
  }, [contactMode, contacts, selectedContacts]);

  function persist(next: Campaign[]) {
    if (!saveJson(KEYS.campaigns, next)) {
      setNotice("Не удалось сохранить кампании в браузере.");
      return;
    }
    setCampaigns(next);
    setNotice("Кампания сохранена.");
  }

  function toggleContact(id: string) {
    setSelectedContacts((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setNotice("Введи название кампании.");
      return;
    }
    if (!audioId) {
      setNotice("Выбери аудиоролик или робота.");
      return;
    }
    if (!sipId) {
      setNotice("Выбери номер отправителя.");
      return;
    }

    const contactsWithPhones = availableContacts.filter(
      (contact) => typeof contact.phone === "string" && contact.phone.trim(),
    );

    if (!contactsWithPhones.length) {
      setNotice("Выбери хотя бы один контакт с телефоном.");
      return;
    }

    const [sourceType, sourceId] = audioId.split(":");
    const sourceName =
      sourceType === "audio"
        ? audios.find((item) => item.id === sourceId)?.name || "Аудиоролик"
        : robots.find((item) => item.id === sourceId)?.name || "Робот";

    const sender = sipNumbers.find((item) => item.id === sipId);

    const campaign: Campaign = {
      id: makeId(),
      name: name.trim(),
      audioId,
      audioName: sourceName,
      sipId,
      sipNumber: sender?.phone || "Не выбран",
      contactIds: contactsWithPhones.map((item) => item.id),
      status: "draft",
      createdAt: new Date().toLocaleString("ru-RU"),
      results: [],
      log: [],
      scenarios,
      settings: {
        maxAttempts,
        retryInterval,
        repeatAudioCount: 1,
        pauseBetweenRepeats: 5,
        considerSuccessfulSeconds: 5,
        startTime,
        endTime,
        weekdays: [1, 2, 3, 4, 5],
      },
    };

    persist([campaign, ...campaigns]);
    setShowForm(false);
    setName("");
    setAudioId("");
    setScenarios([]);
    setSelectedContacts(new Set());
  }

  function runDemo(campaign: Campaign) {
    if (campaign.status === "completed" && campaign.mode === "demo") {
      setNotice("Эта кампания уже выполнена. Создай новую для повторного теста.");
      return;
    }

    const targetContacts = campaign.contactIds
      .map((id) => contacts.find((contact) => contact.id === id))
      .filter((contact): contact is Contact => Boolean(contact?.phone));

    if (!targetContacts.length) {
      setNotice("В кампании не найдены контакты с телефонами.");
      return;
    }

    const outcomes: Outcome[] = [
      "interested",
      "callback",
      "refused",
      "no_answer",
    ];

    const results: CallResult[] = targetContacts.map((contact, index) => {
      const outcomeIndex =
        Array.from(`${campaign.id}:${contact.id}`).reduce(
          (sum, char) => sum + char.charCodeAt(0),
          0,
        ) % outcomes.length;

      const outcome = outcomes[outcomeIndex];

      return {
        contactId: contact.id,
        phone: contact.phone,
        outcome,
        duration: outcome === "no_answer" ? 0 : 12 + ((index * 17) % 73),
        attempts: Math.min(
          Math.max(1, campaign.settings.maxAttempts || 1),
          1 + (index % 2),
        ),
        source: "demo",
      };
    });

    const stamp = new Date().toISOString();
    const updated: Campaign = {
      ...campaign,
      status: "completed",
      mode: "demo",
      completedAt: stamp,
      results,
      log: [
        ...(campaign.log || []),
        `[${new Date(stamp).toLocaleString("ru-RU")}] Выполнена симуляция.`,
        `[${new Date(stamp).toLocaleString("ru-RU")}] Создано результатов: ${results.length}.`,
      ],
    };

    persist(
      campaigns.map((item) => (item.id === campaign.id ? updated : item)),
    );
    setExpandedLog(campaign.id);
  }

  function deleteCampaign(id: string) {
    if (!window.confirm("Удалить кампанию?")) return;
    persist(campaigns.filter((campaign) => campaign.id !== id));
    if (expandedLog === id) setExpandedLog(null);
  }

  function addScenario() {
    setScenarios((current) => [
      ...current,
      {
        id: makeId(),
        actionType: "digits",
        actionValue: "1",
        reactionType: "stop_list",
      },
    ]);
  }

  function exportExcel(campaign: Campaign) {
    const rows = campaign.results.map((result, index) => ({
      "№": index + 1,
      "Телефон": result.phone,
      "Результат": OUTCOME_LABELS[result.outcome],
      "Длительность (сек)": result.duration,
      "Попыток": result.attempts,
      "Источник результата": result.source === "demo" ? "Симуляция" : "Источник не подтверждён",
      "Аудиозапись": "Нет — запись звонка не выполнялась",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Отчёт");
    XLSX.writeFile(workbook, `Kolokol_${campaign.id.slice(0, 8)}.xlsx`);
  }

  if (!loaded) {
    return <div className="p-8 text-center text-gray-400">Загрузка…</div>;
  }

  return (
    <div className="space-y-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Кампании обзвона</h1>
          <p className="mt-1 text-sm text-gray-400">Создание и запуск кампаний.</p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-[#FACC15] hover:underline">← На дашборд</Link>
      </header>

      {notice && (
        <p role="status" className="rounded-lg border border-gray-700 bg-black/20 p-3 text-sm text-gray-200">{notice}</p>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-[#FACC15] px-4 py-2 font-bold text-black">
          {showForm ? "Закрыть" : "+ Создать кампанию"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createCampaign} className="space-y-5 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
          <h2 className="text-lg font-bold">Новая кампания</h2>

          <label className="block text-sm text-gray-300">
            Название кампании
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} placeholder="Например, тестовый сценарий" className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white" />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-gray-300">
              Номер отправителя
              <select value={sipId} onChange={(event) => setSipId(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white">
                <option value="">— Выбрать —</option>
                {sipNumbers.filter((number) => number.isActive).map((number) => (
                  <option key={number.id} value={number.id}>{number.phone} · {number.callerId}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-gray-300">
              Аудиоролик / робот
              <select value={audioId} onChange={(event) => setAudioId(event.target.value)} required className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white">
                <option value="">— Выбрать —</option>
                {audios.length > 0 && (
                  <optgroup label="Аудиоролики">
                    {audios.map((item) => (<option key={item.id} value={`audio:${item.id}`}>{item.name}</option>))}
                  </optgroup>
                )}
                {robots.length > 0 && (
                  <optgroup label="Роботы">
                    {robots.map((item) => (<option key={item.id} value={`robot:${item.id}`}>{item.name}</option>))}
                  </optgroup>
                )}
              </select>
            </label>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-800 p-4">
            <p className="font-semibold">Получатели</p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
              <label className="flex items-center gap-2"><input type="radio" checked={contactMode === "new"} onChange={() => setContactMode("new")} />Только новые ({contacts.filter((contact) => contact.status === "new").length})</label>
              <label className="flex items-center gap-2"><input type="radio" checked={contactMode === "all"} onChange={() => setContactMode("all")} />Все ({contacts.length})</label>
              <label className="flex items-center gap-2"><input type="radio" checked={contactMode === "manual"} onChange={() => setContactMode("manual")} />Вручную ({selectedContacts.size})</label>
            </div>

            {contactMode === "manual" && (
              <div className="max-h-48 overflow-y-auto rounded border border-gray-800">
                {contacts.map((contact) => (
                  <label key={contact.id} className="flex items-center gap-3 border-b border-gray-800 p-3 text-sm last:border-0">
                    <input type="checkbox" checked={selectedContacts.has(contact.id)} onChange={() => toggleContact(contact.id)} />
                    <span>{contact.name || contact.phone}</span>
                    <span className="ml-auto font-mono text-gray-400">{contact.phone}</span>
                  </label>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500">Подходящих контактов с телефонами: {availableContacts.filter((contact) => Boolean(contact.phone)).length}.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-gray-300">Максимум попыток<input type="number" min={1} max={10} value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white" /></label>
            <label className="block text-sm text-gray-300">Интервал повторной попытки (мин)<input type="number" min={5} max={1440} value={retryInterval} onChange={(event) => setRetryInterval(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white" /></label>
            <label className="block text-sm text-gray-300">Начало окна звонков<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white" /></label>
            <label className="block text-sm text-gray-300">Конец окна звонков<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white" /></label>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between"><p className="font-semibold">Сценарии реакции</p><button type="button" onClick={addScenario} className="text-sm text-[#FACC15]">+ Добавить</button></div>
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="grid gap-2 rounded border border-gray-800 p-3 md:grid-cols-3">
                <select value={scenario.actionType} onChange={(event) => setScenarios((current) => current.map((item) => item.id === scenario.id ? { ...item, actionType: event.target.value as Scenario["actionType"] } : item))} className="rounded border border-gray-700 bg-black/40 px-2 py-2 text-sm"><option value="digits">Нажатие цифры</option><option value="words">Произнесение слова</option></select>
                <input value={scenario.actionValue} onChange={(event) => setScenarios((current) => current.map((item) => item.id === scenario.id ? { ...item, actionValue: event.target.value } : item))} placeholder="1 или Да" className="rounded border border-gray-700 bg-black/40 px-2 py-2 text-sm" />
                <div className="flex gap-2">
                  <select value={scenario.reactionType} onChange={(event) => setScenarios((current) => current.map((item) => item.id === scenario.id ? { ...item, reactionType: event.target.value as Scenario["reactionType"] } : item))} className="min-w-0 flex-1 rounded border border-gray-700 bg-black/40 px-2 py-2 text-sm"><option value="stop_list">В стоп-лист</option><option value="redirect">Переадресация</option><option value="play_audio">Проиграть аудио</option></select>
                  <button type="button" onClick={() => setScenarios((current) => current.filter((item) => item.id !== scenario.id))} className="text-sm text-red-400">Удалить</button>
                </div>
                {scenario.reactionType === "redirect" && (<input value={scenario.redirectNumber || ""} onChange={(event) => setScenarios((current) => current.map((item) => item.id === scenario.id ? { ...item, redirectNumber: event.target.value } : item))} placeholder="Номер переадресации" className="rounded border border-gray-700 bg-black/40 px-2 py-2 text-sm" />)}
                {scenario.reactionType === "play_audio" && (<select value={scenario.audioRollId || ""} onChange={(event) => setScenarios((current) => current.map((item) => item.id === scenario.id ? { ...item, audioRollId: event.target.value } : item))} className="rounded border border-gray-700 bg-black/40 px-2 py-2 text-sm"><option value="">— Аудиоролик —</option>{audios.map((item) => (<option key={item.id} value={item.id}>{item.name}</option>))}</select>)}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-gray-300">Отмена</button>
            <button type="submit" className="rounded-lg bg-[#FACC15] px-4 py-2 font-bold text-black">Сохранить черновик</button>
          </div>
        </form>
      )}

      {!showForm && campaigns.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center text-gray-500">Кампаний пока нет.</div>
      )}

      {!showForm && campaigns.map((campaign) => {
        const counts: Record<Outcome, number> = { interested: 0, refused: 0, callback: 0, no_answer: 0 };
        campaign.results.forEach((result) => { if (result.outcome in counts) counts[result.outcome] += 1; });

        return (
          <article key={campaign.id} className="space-y-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{campaign.name}</h2>
                <p className="mt-1 text-sm text-gray-400">{campaign.audioName} · {campaign.contactIds.length} контактов</p>
                <p className="mt-1 text-xs text-gray-500">Номер: {campaign.sipNumber || "не указан"} · Создана: {campaign.createdAt}</p>
                {campaign.mode === "demo" && (<p className="mt-2 inline-block rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">СИМУЛЯЦИЯ</p>)}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => runDemo(campaign)} disabled={campaign.status === "completed" && campaign.mode === "demo"} className="rounded-lg bg-[#FACC15] px-3 py-2 text-sm font-bold text-black disabled:bg-gray-700 disabled:text-gray-400">{campaign.mode === "demo" ? "Завершена" : "Запустить"}</button>
                <button type="button" onClick={() => deleteCampaign(campaign.id)} className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300">Удалить</button>
              </div>
            </div>

            {campaign.results.length > 0 && (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {(Object.keys(counts) as Outcome[]).map((outcome) => (
                  <div key={outcome} className="rounded-lg border border-gray-800 bg-black/20 p-3">
                    <p className="text-xs text-gray-400">{OUTCOME_LABELS[outcome]}</p>
                    <p className="mt-1 text-xl font-bold">{counts[outcome]}</p>
                  </div>
                ))}
              </div>
            )}

            {campaign.results.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-black/30 text-gray-400">
                    <tr><th className="p-3">Телефон</th><th className="p-3">Результат</th><th className="p-3">Длительность</th><th className="p-3">Попытки</th><th className="p-3">Источник</th></tr>
                  </thead>
                  <tbody>
                    {campaign.results.map((result) => (
                      <tr key={`${campaign.id}-${result.contactId}`} className="border-t border-gray-800">
                        <td className="p-3 font-mono">{result.phone}</td>
                        <td className="p-3">{OUTCOME_LABELS[result.outcome]}</td>
                        <td className="p-3">{result.duration} сек</td>
                        <td className="p-3">{result.attempts}</td>
                        <td className="p-3 text-amber-300">{result.source === "demo" ? "Симуляция" : "Не подтверждён"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <button type="button" onClick={() => setExpandedLog((current) => (current === campaign.id ? null : campaign.id))} className="text-sm text-[#FACC15]">{expandedLog === campaign.id ? "Скрыть лог" : `Показать лог (${campaign.log?.length || 0})`}</button>
              {expandedLog === campaign.id && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-800 bg-black/30 p-3 font-mono text-xs text-gray-400">
                  {campaign.log?.length ? campaign.log.map((line, index) => (<p key={`${campaign.id}-log-${index}`}>{line}</p>)) : "Лог пуст."}
                </div>
              )}
            </div>

            {campaign.status === "completed" && (
              <div className="flex justify-end border-t border-gray-800 pt-3">
                <button type="button" onClick={() => exportExcel(campaign)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Скачать отчёт Excel</button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}