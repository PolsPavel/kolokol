"use client";

import Link from "next/link";

const services = [
  ["Голосовые звонки", "Звонки и голосовые роботы"],
  ["SMS / WhatsApp / Telegram", "Сообщения и мессенджеры"],
  ["Email-рассылки", "Отправка электронных писем"],
  ["Парсинг контактов", "Сбор открытых контактных данных"],
  ["Синтез речи", "Создание аудиороликов"],
  ["Автоматизация", "Автоматические сценарии и кампании"],
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Стоимость</h2>
          <p className="text-sm text-gray-400">Перечень услуг платформы</p>
        </div>
        <Link href="/dashboard/instructions" className="text-sm text-[#FACC15]">Инструкции →</Link>
      </div>
      <div className="bg-[#1f1f1f] rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/30">
            <tr>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Услуга</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Описание</th>
              <th className="text-right px-5 py-3 text-gray-400 font-medium">Стоимость</th>
            </tr>
          </thead>
          <tbody>
            {services.map(([name, description]) => (
              <tr key={name} className="border-t border-gray-800">
                <td className="px-5 py-4 text-white font-medium">{name}</td>
                <td className="px-5 py-4 text-gray-400">{description}</td>
                <td className="px-5 py-4 text-right text-white font-semibold">0 ₽</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/analytics" className="bg-[#FACC15] text-black px-4 py-2 rounded-lg font-bold">Баланс и пополнение</Link>
        <Link href="/dashboard/reports" className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700">Отчёты</Link>
      </div>
    </div>
  );
}