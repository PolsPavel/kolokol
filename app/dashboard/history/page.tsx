// app/dashboard/history/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Outcome = "interested" | "refused" | "callback" | "no_answer";

type CallResult = {
  contactId: string;
  phone: string;
  outcome: Outcome;
  duration: number;
  attempts: number;
};

type Campaign = {
  id: string;
  name: string;
  robotName?: string;
  audioName?: string;
  status: string;
  createdAt: string;
  results: CallResult[];
};

type CallRecord = {
  id: string;
  date: string;
  campaignName: string;
  robotName: string;
  phone: string;
  outcome: Outcome;
  duration: number;
  attempts: number;
};

const CAMPAIGNS_KEY = "voicepilot_campaigns";

const OUTCOME_LABELS: Record<Outcome, string> = {
  interested: "Заинтересован",
  refused: "Отказ",
  callback: "Перезвонить",
  no_answer: "Не ответил",
};

const OUTCOME_COLORS: Record<Outcome, string> = {
  interested: "bg-green-900/30 text-green-400",
  refused: "bg-red-900/30 text-red-400",
  callback: "bg-blue-900/30 text-blue-400",
  no_answer: "bg-gray-800 text-gray-300",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOutcome(value: unknown): value is Outcome {
  return (
    value === "interested" ||
    value === "refused" ||
    value === "callback" ||
    value === "no_answer"
  );
}

function isCallResult(value: unknown): value is CallResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.contactId === "string" &&
    typeof value.phone === "string" &&
    isOutcome(value.outcome) &&
    typeof value.duration === "number" &&
    Number.isFinite(value.duration) &&
    typeof value.attempts === "number" &&
    Number.isFinite(value.attempts)
  );
}

function isCampaign(value: unknown): value is Campaign {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.status === "string" &&
    typeof value.createdAt === "string" &&
    (value.robotName === undefined ||
      typeof value.robotName === "string") &&
    (value.audioName === undefined ||
      typeof value.audioName === "string") &&
    Array.isArray(value.results) &&
    value.results.every(isCallResult)
  );
}

function loadCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCampaign);
  } catch (error) {
    console.error("Ошибка загрузки истории звонков", error);
    return [];
  }
}

export default function HistoryPage() {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Outcome>("all");
  const [campaignFilter, setCampaignFilter] = useState("all");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const safeCampaigns = loadCampaigns();
      const allRecords: CallRecord[] = [];

      safeCampaigns.forEach((campaign) => {
        campaign.results.forEach((result, index) => {
          allRecords.push({
            id: `${campaign.id}-${result.contactId}-${index}`,
            date: campaign.createdAt,
            campaignName: campaign.name || "Без названия",
            robotName: campaign.robotName || campaign.audioName || "—",
            phone: result.phone,
            outcome: result.outcome,
            duration: result.duration,
            attempts: result.attempts,
          });
        });
      });

      allRecords.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();

        if (!Number.isFinite(dateA) && !Number.isFinite(dateB)) {
          return 0;
        }

        if (!Number.isFinite(dateA)) {
          return 1;
        }

        if (!Number.isFinite(dateB)) {
          return -1;
        }

        return dateB - dateA;
      });

      setCampaigns(safeCampaigns);
      setRecords(allRecords);
      setIsLoaded(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      !normalizedSearch ||
      record.phone.toLowerCase().includes(normalizedSearch) ||
      record.campaignName.toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter === "all" || record.outcome === statusFilter;

    const matchesCampaign =
      campaignFilter === "all" ||
      record.campaignName === campaignFilter;

    return matchesSearch && matchesStatus && matchesCampaign;
  });

  if (!isLoaded) {
    return (
      <div className="p-8 text-center text-gray-400">Загрузка...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Журнал звонков</h2>

        <Link
          href="/dashboard"
          className="text-sm text-[#FACC15] hover:text-yellow-400 font-medium"
        >
          ← На дашборд
        </Link>
      </div>

      <div className="bg-[#1f1f1f] rounded-xl border border-gray-800 p-4 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label
              htmlFor="history-search"
              className="block text-xs font-medium text-gray-400 mb-1"
            >
              Поиск
            </label>

            <input
              id="history-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Номер или кампания..."
              className="w-64 max-w-full border border-gray-700 bg-black/50 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
          </div>

          <div>
            <label
              htmlFor="history-status"
              className="block text-xs font-medium text-gray-400 mb-1"
            >
              Результат
            </label>

            <select
              id="history-status"
              value={statusFilter}
              onChange={(event) => {
                const value = event.target.value;

                if (value === "all" || isOutcome(value)) {
                  setStatusFilter(value);
                }
              }}
              className="border border-gray-700 bg-black/50 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
            >
              <option value="all">Все</option>
              <option value="interested">Заинтересованы</option>
              <option value="callback">Перезвонить</option>
              <option value="refused">Отказы</option>
              <option value="no_answer">Не ответили</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="history-campaign"
              className="block text-xs font-medium text-gray-400 mb-1"
            >
              Кампания
            </label>

            <select
              id="history-campaign"
              value={campaignFilter}
              onChange={(event) => setCampaignFilter(event.target.value)}
              className="w-48 max-w-full border border-gray-700 bg-black/50 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
            >
              <option value="all">Все</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.name}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[#1f1f1f] rounded-xl border border-gray-800 overflow-hidden">
        {records.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Журнал пуст.
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Ничего не найдено.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-250px)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-black/30 border-b border-gray-800 text-gray-400 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Кампания</th>
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Результат</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Длительность
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-gray-800/50 hover:bg-white/5 transition"
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {record.date || "—"}
                    </td>

                    <td className="px-4 py-3 text-gray-300">
                      {record.campaignName}
                    </td>

                    <td className="px-4 py-3 font-mono text-gray-300">
                      {record.phone}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${OUTCOME_COLORS[record.outcome]}`}
                      >
                        {OUTCOME_LABELS[record.outcome]}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right text-gray-400">
                      {record.duration} сек
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