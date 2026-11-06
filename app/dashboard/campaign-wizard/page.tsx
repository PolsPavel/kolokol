"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Contact = {
  id: string;
  phone?: string;
  email?: string;
  consentCall?: boolean;
  consentEmail?: boolean;
  suppressed?: boolean;
};

type Robot = {
  id: string;
  name: string;
  sourceType?: string;
  textContent?: string;
  audioDataUrl?: string;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  results: unknown[];
  createdAt: string;
  channel: string;
  goal: string;
  robotId: string;
  robotName: string;
  contactIds: string[];
  schedule: { start: string; end: string; days: number[] };
  maxAttempts: number;
  estimatedCost: number;
  costPerMinute: number;
  costPerEmail: number;
  testMode: boolean;
  preflight: string[];
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const steps = ["Цель", "Робот и сценарий", "База контактов", "Расписание и лимиты", "Проверка"];

export default function CampaignWizardPage() {
  const [step, setStep] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [suppression, setSuppression] = useState<string[]>([]);
  const [name, setName] = useState("Новая кампания");
  const [goal, setGoal] = useState("lead");
  const [channel, setChannel] = useState("call");
  const [robotId, setRobotId] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("18:00");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [rate, setRate] = useState(4.72);
  const [emailRate, setEmailRate] = useState(0.15);
  const [budget, setBudget] = useState(5000);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedContacts = read<Contact[]>("voicepilot_contacts", []);
      const savedRobots = read<Robot[]>("voicepilot_robots", []);

      setContacts(savedContacts);
      setRobots(savedRobots);
      setSuppression(read<string[]>("voicepilot_suppression_list", []));

      if (savedRobots[0]) {
        setRobotId(savedRobots[0].id);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const eligible = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          !contact.suppressed &&
          !suppression.includes(contact.phone || "") &&
          !suppression.includes(contact.email || "") &&
          (channel === "call"
            ? Boolean(contact.phone) && contact.consentCall === true
            : Boolean(contact.email) && contact.consentEmail === true)
      ),
    [contacts, channel, suppression]
  );

  const robot = robots.find((item) => item.id === robotId);

  const estimate =
    channel === "call"
      ? eligible.length * maxAttempts * 1.4 * rate
      : eligible.length * emailRate;

  const errors: string[] = [];

  if (!name.trim()) errors.push("Укажите название кампании.");
  if (!eligible.length) errors.push("Нет получателей с нужными данными и согласием.");

  if (channel === "call" && !robot) {
    errors.push("Выберите робота.");
  }

  if (channel === "call" && robot?.sourceType === "text" && !robot.textContent?.trim()) {
    errors.push("У робота отсутствует текст сценария.");
  }

  if (channel === "call" && robot && robot.sourceType !== "text" && !robot.audioDataUrl) {
    errors.push("У робота не найдена аудиозапись.");
  }

  if (!days.length) errors.push("Выберите дни недели.");
  if (start >= end) errors.push("Время начала должно быть раньше окончания.");

  if (!Number.isFinite(rate) || rate < 0) {
    errors.push("Укажите корректную ставку за минуту.");
  }

  if (!Number.isFinite(emailRate) || emailRate < 0) {
    errors.push("Укажите корректную стоимость письма.");
  }

  if (!Number.isFinite(budget) || budget < 0) {
    errors.push("Укажите корректный бюджет.");
  }

  if (estimate > budget) {
    errors.push(`Расчётная стоимость ${estimate.toFixed(2)} ₽ превышает бюджет.`);
  }

  const checks = [
    ...errors,
    "Внешний провайдер не подключён: реальные звонки и отправка пока недоступны.",
    "Тестовый режим включён: внешние действия не выполняются.",
  ];

  const save = () => {
    if (errors.length) {
      setMessage("Исправьте ошибки выше. Черновик не сохранён.");
      return;
    }

    try {
      const old = read<Campaign[]>("voicepilot_campaign_drafts", []);

      const item: Campaign = {
        id: `camp_${Date.now().toString(36)}`,
        name: name.trim(),
        status: "draft",
        results: [],
        createdAt: new Date().toISOString(),
        channel: channel === "call" ? "Звонки" : "Email",
        goal,
        robotId,
        robotName: robot?.name || "",
        contactIds: eligible.map((contact) => contact.id),
        schedule: { start, end, days },
        maxAttempts,
        costPerMinute: rate,
        costPerEmail: emailRate,
        estimatedCost: estimate,
        testMode: true,
        preflight: checks,
      };

      localStorage.setItem("voicepilot_campaign_drafts", JSON.stringify([item, ...old]));
      setMessage("Черновик сохранён локально. Реальный запуск отключён до подключения сервера и провайдера.");
    } catch {
      setMessage("Не удалось сохранить черновик в браузере.");
    }
  };

  const daysNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-white">
      <div>
        <Link href="/dashboard/campaigns" className="text-sm text-[#FACC15]">
          ← Кампании
        </Link>
        <h2 className="mt-2 text-3xl font-bold">Мастер запуска кампании</h2>
        <p className="mt-1 text-sm text-gray-400">
          Пять шагов — от цели до проверки перед запуском.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {steps.map((item, index) => (
          <button
            key={item}
            onClick={() => setStep(index)}
            className={`rounded-xl border p-3 text-left ${
              index === step
                ? "border-[#FACC15] bg-[#FACC15]/10"
                : "border-gray-800 bg-[#171717]"
            }`}
          >
            <p className="text-xs text-[#FACC15]">ШАГ {index + 1}</p>
            <p className="mt-1 text-xs font-semibold sm:text-sm">{item}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="rounded-2xl border border-gray-800 bg-[#171717] p-5 sm:p-7">
          {step === 0 && (
            <div className="space-y-5">
              <h3 className="text-xl font-bold">Цель и канал</h3>

              <label className="block text-sm text-gray-300">
                Название
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3"
                />
              </label>

              <label className="block text-sm text-gray-300">
                Цель
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3"
                >
                  <option value="lead">Квалификация лида</option>
                  <option value="callback">Обратный звонок</option>
                  <option value="reminder">Подтверждение / напоминание</option>
                  <option value="notification">Уведомление</option>
                </select>
              </label>

              <label className="block text-sm text-gray-300">
                Канал
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3"
                >
                  <option value="call">Голосовой звонок</option>
                  <option value="email">Email-рассылка</option>
                </select>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Робот и сценарий</h3>

              {channel === "call" ? (
                <>
                  <label className="block text-sm text-gray-300">
                    Выберите робота
                    <select
                      value={robotId}
                      onChange={(e) => setRobotId(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3"
                    >
                      <option value="">Не выбран</option>
                      {robots.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {robot && (
                    <div className="rounded-xl border border-gray-700 p-4">
                      <p className="font-semibold">{robot.name}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-400">
                        {robot.textContent || "Аудио-сценарий выбранного робота."}
                      </p>
                    </div>
                  )}

                  <Link href="/dashboard/robots" className="text-sm text-[#FACC15]">
                    Создать или изменить робота →
                  </Link>
                </>
              ) : (
                <div className="rounded-xl border border-gray-700 p-4">
                  <p className="font-semibold">Email</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Настройка темы и шаблона доступна в модуле Email. Кампания будет сохранена как черновик.
                  </p>
                  <Link href="/dashboard/email" className="mt-3 inline-block text-sm text-[#FACC15]">
                    Открыть Email →
                  </Link>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">База контактов</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/30 p-4">
                  <p className="text-xs text-gray-500">Всего контактов</p>
                  <p className="mt-1 text-2xl font-bold">{contacts.length}</p>
                </div>
                <div className="rounded-xl bg-black/30 p-4">
                  <p className="text-xs text-gray-500">Подходят каналу</p>
                  <p className="mt-1 text-2xl font-bold">{eligible.length}</p>
                </div>
              </div>

              <p className="text-sm leading-6 text-gray-400">
                В выборку включаются только контакты без блокировки, с номером телефона или email
                и явной отметкой согласия для выбранного канала. Остальные автоматически исключены.
              </p>

              <Link href="/dashboard/contacts" className="text-sm text-[#FACC15]">
                Управлять контактами и согласиями →
              </Link>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-xl font-bold">Расписание и лимиты</h3>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-gray-300">
                  Начало
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-700 bg-black/30 p-3"
                  />
                </label>
                <label className="text-sm text-gray-300">
                  Окончание
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-700 bg-black/30 p-3"
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm text-gray-300">Дни недели</p>
                <div className="flex flex-wrap gap-2">
                  {daysNames.map((day, index) => (
                    <button
                      key={day}
                      onClick={() =>
                        setDays((old) =>
                          old.includes(index)
                            ? old.filter((value) => value !== index)
                            : [...old, index]
                        )
                      }
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        days.includes(index)
                          ? "border-[#FACC15] bg-[#FACC15] text-black"
                          : "border-gray-700"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {channel === "call" && (
                <label className="block text-sm text-gray-300">
                  Попыток на контакт
                  <select
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-gray-700 bg-black/30 p-3"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-gray-300">
                  {channel === "call" ? "Ставка, ₽/минута" : "Стоимость письма, ₽/адрес"}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={channel === "call" ? rate : emailRate}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (channel === "call") setRate(value);
                      else setEmailRate(value);
                    }}
                    className="mt-2 w-full rounded-xl border border-gray-700 bg-black/30 p-3"
                  />
                </label>

                <label className="text-sm text-gray-300">
                  Бюджет ₽
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-gray-700 bg-black/30 p-3"
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-gray-700 p-4">
                <input type="checkbox" checked disabled className="mt-1 accent-yellow-400" />
                <span>
                  <b>Тестовый режим</b>
                  <span className="mt-1 block text-sm text-gray-400">
                    Не выполняет внешние звонки или отправку. В этой версии режим всегда принудительно включён.
                  </span>
                </span>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Проверка кампании</h3>

              <div className="rounded-xl border border-gray-700 p-4">
                <p className="text-sm text-gray-400">Оценка стоимости</p>
                <p className="mt-1 text-3xl font-bold">
                  {estimate.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Модельная оценка, не фактическая тарификация.
                </p>
              </div>

              {checks.map((item, index) => (
                <div
                  key={`${index}-${item}`}
                  className={`rounded-xl p-3 text-sm ${
                    errors.includes(item)
                      ? "bg-red-400/10 text-red-200"
                      : "bg-amber-300/10 text-amber-100"
                  }`}
                >
                  {errors.includes(item) ? "✕" : "!"} {item}
                </div>
              ))}

              <div className="rounded-xl p-3 text-sm bg-amber-300/10 text-amber-100">
                {contacts.length - eligible.length} контакт(ов) исключено из выборки.
              </div>

              <button
                onClick={save}
                disabled={errors.length > 0}
                className="rounded-xl bg-[#FACC15] px-5 py-3 font-bold text-black disabled:opacity-50"
              >
                Сохранить черновик
              </button>

              {message && (
                <p className="rounded-xl bg-sky-400/10 p-4 text-sm text-sky-200">
                  {message}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-between border-t border-gray-800 pt-5">
            <button
              disabled={step === 0}
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              className="rounded-xl border border-gray-700 px-4 py-2 disabled:opacity-30"
            >
              Назад
            </button>

            <button
              onClick={() => setStep((value) => Math.min(4, value + 1))}
              className="rounded-xl bg-[#FACC15] px-5 py-2 font-bold text-black"
            >
              {step === 4 ? "Остаться на проверке" : "Продолжить →"}
            </button>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-gray-800 bg-[#171717] p-5">
          <h3 className="font-bold">Сводка</h3>

          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Кампания</dt>
              <dd className="mt-1 font-semibold">{name || "Не указана"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Канал</dt>
              <dd className="mt-1">{channel === "call" ? "Звонки" : "Email"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Получатели</dt>
              <dd className="mt-1 text-2xl font-bold">{eligible.length}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Оценка стоимости</dt>
              <dd className="mt-1 text-2xl font-bold">
                {estimate.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽
              </dd>
            </div>
          </dl>

          <p className="mt-5 rounded-xl bg-black/30 p-3 text-xs leading-5 text-gray-500">
            Данные пока хранятся в браузере. Реальный запуск будет подключён на следующем этапе разработки.
          </p>
        </aside>
      </div>
    </div>
  );
}