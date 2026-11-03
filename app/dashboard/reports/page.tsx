"use client";

import { useState } from "react";
import Link from "next/link";

export default function ReportsPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/reports/export");

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setMessage(result.error || "Ошибка формирования отчёта.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "kolokol-report.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Отчёт сформирован.");
    } catch {
      setMessage("Ошибка соединения при формировании отчёта.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/reports/export-email", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      setMessage(
        response.ok
          ? `Отчёт отправлен на ${result.sentTo || "вашу почту"}.`
          : result.error || "Ошибка отправки."
      );
    } catch {
      setMessage("Ошибка соединения при отправке отчёта.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Отчёты</h2>
          <p className="text-sm text-gray-400">
            Финансовые операции и история Email-рассылок из базы данных
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-[#FACC15]">
          ← На дашборд
        </Link>
      </div>

      <section className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 space-y-4">
        <p className="text-gray-300">
          Отчёт содержит записи финансовых операций и сохранённую историю Email-рассылок.
          Данные кампаний, которые существуют только в браузерном localStorage,
          в серверный отчёт не включаются.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            onClick={download}
            className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Скачать Excel
          </button>

          <button
            disabled={busy}
            onClick={send}
            className="bg-[#FACC15] text-black font-bold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Отправить Excel на мою почту
          </button>
        </div>

        {message && <p className="text-sm text-gray-300">{message}</p>}
      </section>
    </div>
  );
}