"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createLocalId,
  readLocalJson,
  STORAGE_KEYS,
  writeLocalJson,
  type DemoCallRecord,
} from "@/lib/demo-mode";

type SipNumber = {
  id: string;
  phone: string;
  callerId: string;
  isActive: boolean;
  mode?: "demo";
};

function loadNumbers(): SipNumber[] {
  const stored = readLocalJson<unknown>(STORAGE_KEYS.sipNumbers, []);

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.flatMap((item): SipNumber[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const value = item as Record<string, unknown>;

    if (
      typeof value.id !== "string" ||
      typeof value.phone !== "string" ||
      typeof value.callerId !== "string"
    ) {
      return [];
    }

    return [
      {
        id: value.id,
        phone: value.phone,
        callerId: value.callerId,
        isActive: value.isActive === true,
        mode: "demo",
      },
    ];
  });
}

function normalizePhone(value: string): string {
  return value.trim().replace(/[^\d+]/g, "");
}

export default function TelephonyPage() {
  const [numbers, setNumbers] = useState<SipNumber[]>([]);
  const [callLog, setCallLog] = useState<DemoCallRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [callerId, setCallerId] = useState("Kolokol Demo");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNumbers(loadNumbers());

      const storedCallLog = readLocalJson<DemoCallRecord[]>(
        STORAGE_KEYS.callLog,
        [],
      );

      setCallLog(
        Array.isArray(storedCallLog) ? storedCallLog.slice(0, 30) : [],
      );

      setLoaded(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function persistNumbers(next: SipNumber[]) {
    setNumbers(next);

    if (!writeLocalJson(STORAGE_KEYS.sipNumbers, next)) {
      setNotice("Не удалось сохранить номера в браузере.");
      return;
    }

    setNotice("Изменения сохранены локально. Voximplant не вызывался.");
  }

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const normalizedPhone = normalizePhone(phone);
    const normalizedCallerId = callerId.trim();

    if (!/^\+?[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setNotice(
        "Укажи корректный номер: от 8 до 15 цифр, при необходимости с +.",
      );
      return;
    }

    if (!normalizedCallerId) {
      setNotice("Укажи имя отправителя / Caller ID для тестового профиля.");
      return;
    }

    const duplicate = numbers.some(
      (number) => number.phone === normalizedPhone,
    );

    if (duplicate) {
      setNotice("Этот номер уже есть в списке.");
      return;
    }

    const newNumber: SipNumber = {
      id: createLocalId(),
      phone: normalizedPhone,
      callerId: normalizedCallerId,
      isActive: true,
      mode: "demo",
    };

    persistNumbers([newNumber, ...numbers]);
    setPhone("");
    setCallerId("Kolokol Demo");
    setShowForm(false);
  }

  function toggleNumber(id: string) {
    persistNumbers(
      numbers.map((number) =>
        number.id === id
          ? { ...number, isActive: !number.isActive }
          : number,
      ),
    );
  }

  function deleteNumber(id: string) {
    if (!window.confirm("Удалить этот тестовый номер?")) {
      return;
    }

    persistNumbers(numbers.filter((number) => number.id !== id));
  }

  function simulateCall(number: SipNumber) {
    const record: DemoCallRecord = {
      id: createLocalId(),
      phone: number.phone,
      callerId: number.callerId,
      status: "simulated",
      createdAt: new Date().toISOString(),
      note: "Тестовая запись. Реальный вызов через Voximplant не выполнялся.",
    };

    const next = [record, ...callLog].slice(0, 30);

    setCallLog(next);

    if (!writeLocalJson(STORAGE_KEYS.callLog, next)) {
      setNotice("Тестовый вызов не удалось сохранить в браузере.");
      return;
    }

    setNotice(
      `Создана тестовая запись для ${number.phone}. Реального звонка не было.`,
    );
  }

  function clearCallLog() {
    if (!window.confirm("Очистить локальную историю тестовых звонков?")) {
      return;
    }

    setCallLog([]);

    if (!writeLocalJson(STORAGE_KEYS.callLog, [])) {
      setNotice("Не удалось сохранить изменения истории в браузере.");
      return;
    }

    setNotice("Локальная история тестовых звонков очищена.");
  }

  if (!loaded) {
    return <div className="p-8 text-center text-gray-400">Загрузка…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#FACC15]">
            Телефония
          </p>
          <h1 className="mt-2 text-3xl font-bold">Voximplant / SIP</h1>
          <p className="mt-2 text-sm text-gray-400">
            Управление тестовыми номерами до подключения провайдера.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#FACC15] hover:underline"
        >
          ← На дашборд
        </Link>
      </header>

      <section className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="font-semibold text-amber-200">Работа без телефонии</p>
        <p className="mt-1 text-sm text-amber-100/80">
          Номера на этой странице — локальные тестовые записи. Статус
          «Активен» не означает регистрацию в SIP и не позволяет совершать
          реальные звонки. Пароли SIP здесь не запрашиваются и не хранятся.
        </p>
      </section>

      {notice && (
        <p
          role="status"
          className="rounded-lg border border-gray-700 bg-black/20 p-3 text-sm text-gray-200"
        >
          {notice}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="rounded-lg bg-[#FACC15] px-4 py-2 font-bold text-black hover:bg-yellow-300"
        >
          {showForm ? "Закрыть форму" : "+ Добавить тестовый номер"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="space-y-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6"
        >
          <h2 className="text-lg font-semibold">Новый тестовый номер</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-gray-300">
              Номер телефона
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                maxLength={24}
                placeholder="+79991234567"
                className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white outline-none focus:border-[#FACC15]"
              />
            </label>

            <label className="block text-sm text-gray-300">
              Caller ID / название
              <input
                value={callerId}
                onChange={(event) => setCallerId(event.target.value)}
                required
                maxLength={80}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white outline-none focus:border-[#FACC15]"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-700 px-4 py-2 text-gray-300 hover:bg-gray-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#FACC15] px-4 py-2 font-bold text-black hover:bg-yellow-300"
            >
              Сохранить локально
            </button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Тестовые номера</h2>

        {numbers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
            <p className="text-gray-300">Тестовых номеров пока нет.</p>
            <p className="mt-2 text-sm text-gray-500">
              Добавь номер, чтобы проверить сценарий локальной кампании.
            </p>
          </div>
        ) : (
          numbers.map((number) => (
            <article
              key={number.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-4"
            >
              <div>
                <p className="font-semibold">{number.phone}</p>
                <p className="mt-1 text-sm text-gray-400">
                  Caller ID: {number.callerId}
                </p>
                <p className="mt-1 text-xs text-amber-300">
                  Тестовая запись · не подключена к Voximplant
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    number.isActive
                      ? "bg-emerald-900/40 text-emerald-300"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {number.isActive ? "Активен в демо" : "Выключен"}
                </span>

                <button
                  type="button"
                  onClick={() => simulateCall(number)}
                  disabled={!number.isActive}
                  className="rounded-lg border border-[#FACC15]/50 px-3 py-2 text-sm text-[#FACC15] hover:bg-[#FACC15]/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Тестовый звонок
                </button>

                <button
                  type="button"
                  onClick={() => toggleNumber(number.id)}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                >
                  {number.isActive ? "Выключить" : "Включить"}
                </button>

                <button
                  type="button"
                  onClick={() => deleteNumber(number.id)}
                  className="px-2 py-2 text-sm text-red-400 hover:text-red-300"
                >
                  Удалить
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">История тестовых звонков</h2>
          {callLog.length > 0 && (
            <button
              type="button"
              onClick={clearCallLog}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Очистить историю
            </button>
          )}
        </div>

        {callLog.length === 0 ? (
          <p className="rounded-xl border border-gray-800 p-6 text-sm text-gray-500">
            Записей пока нет.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-black/30 text-gray-400">
                <tr>
                  <th className="p-3 font-medium">Время</th>
                  <th className="p-3 font-medium">Номер</th>
                  <th className="p-3 font-medium">Caller ID</th>
                  <th className="p-3 font-medium">Результат</th>
                </tr>
              </thead>
              <tbody>
                {callLog.map((record) => (
                  <tr key={record.id} className="border-t border-gray-800">
                    <td className="p-3 text-gray-300">
                      {new Date(record.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="p-3">{record.phone}</td>
                    <td className="p-3 text-gray-300">{record.callerId}</td>
                    <td className="p-3 text-amber-300">Симуляция</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
