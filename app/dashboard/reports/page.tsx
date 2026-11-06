// app/dashboard/reports/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SendResult = { email: string; status: "success" | "skipped"; };
type Tx = { id: string; amount: number; description: string; createdAt: string; };

type ReportRow = {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  source: "financial" | "email";
  totalCost?: number;
  relatedTransactions?: Tx[];
  details: { total: number; sent: number; results: SendResult[]; } | null;
};

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/data", { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось загрузить отчет");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); setMessage("Ошибка загрузки отчета"); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const download = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/reports/export");
      if (!response.ok) { const result = await response.json().catch(() => ({})); setMessage(result.error || "Ошибка формирования отчёта."); return; }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = "kolokol-report.xlsx"; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage("Отчёт сформирован.");
    } catch { setMessage("Ошибка соединения при формировании отчёта."); } finally { setBusy(false); }
  };

  const send = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/reports/export-email", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      setMessage(response.ok ? `Отчёт отправлен на ${result.sentTo || "вашу почту"}.` : result.error || "Ошибка отправки.");
    } catch { setMessage("Ошибка соединения при отправке отчёта."); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-white">Отчёты</h2><p className="text-sm text-gray-400">Финансовые операции и история Email-рассылок</p></div>
        <Link href="/dashboard" className="text-sm text-[#FACC15]">← На дашборд</Link>
      </div>

      <section className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 space-y-4">
        <p className="text-gray-300">Детализированный отчёт по всем операциям вашего аккаунта. Вы можете скачать его или отправить на почту.</p>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={download} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">Скачать Excel</button>
          <button disabled={busy} onClick={send} className="bg-[#FACC15] text-black font-bold px-4 py-2 rounded-lg disabled:opacity-50">Отправить Excel на мою почту</button>
        </div>
        {message && <p className="text-sm text-gray-300">{message}</p>}
      </section>

      <section className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-2">Детализация операций</h3>
        {isLoading ? <p className="text-gray-400">Загрузка...</p> : rows.length === 0 ? <p className="text-gray-500">Операций пока нет.</p> : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-black/20 gap-3">
                  <div>
                    <p className="text-sm text-gray-300 whitespace-nowrap">{new Date(row.date).toLocaleString("ru-RU")}</p>
                    <p className="text-white font-medium mt-1">{row.source === "email" ? `Email: ${row.description}` : row.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Тип: {row.type}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-bold ${row.amount < 0 ? "text-red-400" : row.amount > 0 ? "text-green-400" : "text-gray-400"}`}>{row.amount !== 0 ? `${row.amount > 0 ? "+" : ""}${row.amount.toFixed(2)} ₽` : "—"}</p>
                    </div>
                    {row.source === "email" && row.details && (
                      <button onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} className="text-[#FACC15] text-sm font-medium hover:underline">{expandedId === row.id ? "Скрыть детали" : "Показать детали"}</button>
                    )}
                  </div>
                </div>

                {row.source === "email" && row.details && expandedId === row.id && (
                  <div className="p-4 border-t border-gray-800 bg-black/10">
                    <div className="flex flex-wrap gap-4 text-sm mb-4 text-gray-400">
                      <span>Всего адресов: <b className="text-white">{row.details.total}</b></span>
                      <span className="text-green-400">Отправлено: <b>{row.details.sent}</b></span>
                      <span className="text-blue-400">Стоимость: <b>{(row.totalCost || 0).toFixed(2)} ₽</b></span>
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded border border-gray-800">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-black/30 text-gray-400 sticky top-0"><tr><th className="px-3 py-2">Email</th><th className="px-3 py-2">Статус</th></tr></thead>
                        <tbody>
                          {row.details.results.map((res, idx) => (
                            <tr key={idx} className="border-t border-gray-800">
                              <td className="px-3 py-2 font-mono">{res.email}</td>
                              <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${res.status === "success" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"}`}>{res.status === "success" ? "Отправлено" : "Пропущено"}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {row.relatedTransactions && row.relatedTransactions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-400 mb-2">Списания по этой рассылке:</p>
                        <div className="space-y-1">
                          {row.relatedTransactions.map((tx) => (
                            <div key={tx.id} className="flex justify-between text-xs bg-black/20 p-2 rounded">
                              <span className="text-gray-500">{new Date(tx.createdAt).toLocaleString("ru-RU")}</span>
                              <span className={tx.amount < 0 ? "text-red-400" : "text-green-400"}>{tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)} ₽</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}