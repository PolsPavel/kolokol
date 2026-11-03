"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  executeAutomation,
  persistRun,
} from "@/lib/automation/engine";

import {
  AUTOMATIONS_KEY,
  createId,
  loadAutomations,
  loadRuns,
  loadTasks,
  writeLocal,
} from "@/lib/automation/storage";

import type {
  Automation,
  AutomationAction,
  AutomationCondition,
  AutomationRun,
  DemoTask,
} from "@/lib/automation/types";

const STATUS_LABELS: Record<AutomationRun["status"], string> = {
  executed: "Выполнено локально",
  skipped: "Пропущено",
  failed: "Ошибка",
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<Automation[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [tasks, setTasks] = useState<DemoTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");

  const [name, setName] = useState("");
  const [eventType, setEventType] =
    useState<Automation["event"]>("manual_test");

  const [conditionType, setConditionType] =
    useState<AutomationCondition["type"]>("always");

  const [phoneContains, setPhoneContains] = useState("+7");

  const [actionType, setActionType] =
    useState<AutomationAction["type"]>("create_task");

  const [actionText, setActionText] =
    useState("Перезвонить контакту");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRules(loadAutomations());
      setRuns(loadRuns().slice(0, 50));
      setTasks(loadTasks().slice(0, 50));
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function saveRules(next: Automation[]) {
    if (!writeLocal(AUTOMATIONS_KEY, next)) {
      setNotice("Не удалось сохранить правила в браузере.");
      return;
    }

    setRules(next);
    setNotice(
      "Правила сохранены локально. Внешние сервисы не затрагивались.",
    );
  }

  function addRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedAction = actionText.trim();

    if (!trimmedName || !trimmedAction) {
      setNotice("Заполни название правила и действие.");
      return;
    }

    if (
      conditionType === "phone_contains" &&
      !phoneContains.trim()
    ) {
      setNotice("Укажи фрагмент номера для условия.");
      return;
    }

    const condition: AutomationCondition =
      conditionType === "always"
        ? { type: "always" }
        : {
            type: "phone_contains",
            value: phoneContains.trim(),
          };

    const action: AutomationAction =
      actionType === "create_task"
        ? {
            type: "create_task",
            title: trimmedAction,
          }
        : {
            type: "log_only",
            message: trimmedAction,
          };

    const rule: Automation = {
      id: createId(),
      name: trimmedName,
      event: eventType,
      condition,
      action,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    saveRules([rule, ...rules]);
    setName("");
  }

  function toggleRule(id: string) {
    saveRules(
      rules.map((rule) =>
        rule.id === id
          ? { ...rule, enabled: !rule.enabled }
          : rule,
      ),
    );
  }

  function deleteRule(id: string) {
    if (!window.confirm("Удалить это правило автоматизации?")) {
      return;
    }

    saveRules(rules.filter((rule) => rule.id !== id));
  }

  function runTest(rule: Automation) {
    const context = {
      phone: "+79990000000",
      campaignName: "Тестовая кампания Kolokol",
      event: rule.event,
    };

    const result = executeAutomation(rule, context);

    if (!persistRun(result.run)) {
      setNotice(
        "Результат выполнения не удалось сохранить в браузере.",
      );
      return;
    }

    setRuns((current) =>
      [result.run, ...current].slice(0, 50),
    );

    if (result.task) {
      setTasks((current) =>
        [result.task!, ...current].slice(0, 50),
      );
    }

    setNotice(
      `${STATUS_LABELS[result.run.status]}: ${result.run.message}`,
    );
  }

  function clearRunHistory() {
    if (!window.confirm("Очистить историю тестовых запусков?")) {
      return;
    }

    if (!writeLocal("voicepilot_automation_runs", [])) {
      setNotice("Не удалось очистить историю.");
      return;
    }

    setRuns([]);
    setNotice("История тестовых запусков очищена.");
  }

  if (!loaded) {
    return (
      <div className="p-8 text-center text-gray-400">
        Загрузка…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#FACC15]">
            Автоматизации
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Конструктор правил
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Событие → условие → локальное действие.
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
        <p className="font-semibold text-amber-200">
          Безопасный деморежим
        </p>

        <p className="mt-1 text-sm text-amber-100/80">
          Правила выполняются только при нажатии тестовой кнопки.
          Они не звонят, не отправляют SMS, не создают записи в
          Bitrix24 и не изменяют стоп-лист. Задачи и история
          сохраняются только в localStorage этого браузера.
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

      <form
        onSubmit={addRule}
        className="space-y-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6"
      >
        <h2 className="text-xl font-bold">
          Создать правило
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-gray-300">
            Название

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
              placeholder="Например, задача после теста"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white outline-none focus:border-[#FACC15]"
            />
          </label>

          <label className="text-sm text-gray-300">
            Событие

            <select
              value={eventType}
              onChange={(event) =>
                setEventType(
                  event.target.value as Automation["event"],
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white"
            >
              <option value="manual_test">
                Ручной тест
              </option>

              <option value="campaign_demo_completed">
                Демо-кампания завершена
              </option>
            </select>
          </label>

          <label className="text-sm text-gray-300">
            Условие

            <select
              value={conditionType}
              onChange={(event) =>
                setConditionType(
                  event.target.value as AutomationCondition["type"],
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white"
            >
              <option value="always">
                Всегда выполнять
              </option>

              <option value="phone_contains">
                Номер содержит фрагмент
              </option>
            </select>
          </label>

          {conditionType === "phone_contains" && (
            <label className="text-sm text-gray-300">
              Фрагмент номера

              <input
                value={phoneContains}
                onChange={(event) =>
                  setPhoneContains(event.target.value)
                }
                maxLength={30}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white"
              />
            </label>
          )}

          <label className="text-sm text-gray-300">
            Действие

            <select
              value={actionType}
              onChange={(event) =>
                setActionType(
                  event.target.value as AutomationAction["type"],
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white"
            >
              <option value="create_task">
                Создать локальную задачу
              </option>

              <option value="log_only">
                Записать событие в историю
              </option>
            </select>
          </label>

          <label className="text-sm text-gray-300">
            {actionType === "create_task"
              ? "Название задачи"
              : "Текст записи"}

            <input
              value={actionText}
              onChange={(event) =>
                setActionText(event.target.value)
              }
              required
              maxLength={200}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-[#FACC15] px-4 py-2 font-bold text-black hover:bg-yellow-300"
          >
            Сохранить правило
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Правила ({rules.length})
        </h2>

        {rules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-700 p-8 text-sm text-gray-500">
            Правил пока нет. Создай первое правило выше.
          </p>
        ) : (
          rules.map((rule) => (
            <article
              key={rule.id}
              className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">
                    {rule.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-400">
                    Событие:{" "}
                    {rule.event === "manual_test"
                      ? "Ручной тест"
                      : "Демо-кампания завершена"}
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    Условие:{" "}
                    {rule.condition.type === "always"
                      ? "всегда"
                      : `номер содержит «${rule.condition.value}»`}
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    Действие:{" "}
                    {rule.action.type === "create_task"
                      ? `локальная задача «${rule.action.title}»`
                      : `запись «${rule.action.message}»`}
                  </p>

                  <p
                    className={`mt-2 text-xs ${
                      rule.enabled
                        ? "text-emerald-300"
                        : "text-gray-500"
                    }`}
                  >
                    {rule.enabled
                      ? "Включено для ручного теста"
                      : "Выключено"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => runTest(rule)}
                    className="rounded-lg border border-[#FACC15]/50 px-3 py-2 text-sm text-[#FACC15] hover:bg-[#FACC15]/10"
                  >
                    Тестировать
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                  >
                    {rule.enabled ? "Выключить" : "Включить"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteRule(rule.id)}
                    className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950/40"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">
            История запусков
          </h2>

          {runs.length > 0 && (
            <button
              type="button"
              onClick={clearRunHistory}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Очистить историю
            </button>
          )}
        </div>

        {runs.length === 0 ? (
          <p className="rounded-xl border border-gray-800 p-6 text-sm text-gray-500">
            Тестовых запусков пока нет.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-black/30 text-gray-400">
                <tr>
                  <th className="p-3">Время</th>
                  <th className="p-3">Правило</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Результат</th>
                </tr>
              </thead>

              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-t border-gray-800"
                  >
                    <td className="whitespace-nowrap p-3 text-gray-400">
                      {new Date(run.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="p-3">
                      {run.automationName}
                    </td>
                    <td className="p-3">
                      {STATUS_LABELS[run.status]}
                    </td>
                    <td className="p-3 text-gray-300">
                      {run.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Локальные демо-задачи ({tasks.length})
        </h2>

        {tasks.length === 0 ? (
          <p className="rounded-xl border border-gray-800 p-6 text-sm text-gray-500">
            Задач пока нет. Выполни тест правила с действием
            «Создать локальную задачу».
          </p>
        ) : (
          tasks.map((task) => (
            <article
              key={task.id}
              className="rounded-lg border border-gray-800 bg-[#1f1f1f] p-4"
            >
              <p className="font-semibold">
                {task.title}
              </p>

              <p className="mt-1 text-sm text-gray-400">
                {task.phone} · {task.campaignName}
              </p>

              <p className="mt-1 text-xs text-amber-300">
                Локальная демо-задача ·{" "}
                {new Date(task.createdAt).toLocaleString("ru-RU")}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}