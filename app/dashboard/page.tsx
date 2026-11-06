// app/dashboard/page.tsx
"use client";

import Link from "next/link";

const services = [
  ["Голосовые звонки", "Звонки и голосовые роботы"],
  ["SMS / WhatsApp / Telegram", "Сообщения и мессенджеры"],
  ["Email-рассылки", "Отправка электронных писем"],
  ["Парсинг контактов", "Сбор открытых контактных данных"],
  ["Синтез речи", "Создание аудиороликов (скачивание)"],
  ["Запись с микрофона", "Создание аудиороликов (скачивание)"],
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

      {/* Блок с ценой на синтез речи */}
      <div className="bg-[#1f1f1f] rounded-xl border border-gray-800 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Синтез речи и запись с микрофона</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
            <p className="text-sm text-gray-400">Стоимость скачивания</p>
            <p className="text-2xl font-bold text-[#FACC15] mt-1">15 ₽ <span className="text-sm font-normal text-gray-400">/ 1000 символов</span></p>
            <p className="text-xs text-gray-500 mt-2">Для микрофонных записей: 1 секунда = 10 символов.</p>
          </div>
          <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
            <p className="text-sm text-gray-400">Бесплатный лимит</p>
            <p className="text-2xl font-bold text-green-400 mt-1">до 100 символов</p>
            <p className="text-xs text-gray-500 mt-2">Доступно не более 2 бесплатных роликов с нулевого баланса (только для синтеза речи).</p>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          * Прослушивание роликов в интерфейсе — бесплатно. Стоимость списывается только при скачивании файла.
        </p>
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
                <td className="px-5 py-4 text-right text-white font-semibold">
                  {name === "Синтез речи" || name === "Запись с микрофона"
                    ? "15 ₽ / 1000 символов" 
                    : "0 ₽"}
                </td>
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