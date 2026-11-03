import type {
  Automation,
  AutomationContext,
  AutomationRun,
  DemoTask,
} from "./types";

import {
  createId,
  DEMO_TASKS_KEY,
  AUTOMATION_RUNS_KEY,
  loadTasks,
  readLocal,
  writeLocal,
} from "./storage";

export type AutomationExecution = {
  run: AutomationRun;
  task?: DemoTask;
};

/**
 * Выполняет одно правило только над локальными демоданными.
 * Модуль не отправляет сообщения, не совершает звонки,
 * не изменяет CRM и не редактирует стоп-лист.
 */
export function executeAutomation(
  automation: Automation,
  context: AutomationContext,
): AutomationExecution {
  const now = new Date().toISOString();

  const baseRun = {
    id: createId(),
    automationId: automation.id,
    automationName: automation.name,
    context,
    createdAt: now,
  };

  if (!automation.enabled) {
    return {
      run: {
        ...baseRun,
        status: "skipped",
        message: "Правило выключено; действия не выполнялись.",
      },
    };
  }

  if (automation.event !== context.event) {
    return {
      run: {
        ...baseRun,
        status: "skipped",
        message: "Событие не совпало с настроенным триггером.",
      },
    };
  }

  if (
    automation.condition.type === "phone_contains" &&
    !context.phone.includes(automation.condition.value.trim())
  ) {
    return {
      run: {
        ...baseRun,
        status: "skipped",
        message: "Условие для номера телефона не выполнено.",
      },
    };
  }

  if (automation.action.type === "log_only") {
    return {
      run: {
        ...baseRun,
        status: "executed",
        message: `Локальная запись: ${automation.action.message}`,
      },
    };
  }

  const title = automation.action.title.trim();

  if (!title) {
    return {
      run: {
        ...baseRun,
        status: "failed",
        message: "Название локальной задачи пустое.",
      },
    };
  }

  const task: DemoTask = {
    id: createId(),
    title,
    phone: context.phone,
    campaignName: context.campaignName,
    source: "automation_demo",
    createdAt: now,
  };

  const existing = loadTasks();
  const persisted = writeLocal(
    DEMO_TASKS_KEY,
    [task, ...existing].slice(0, 500),
  );

  if (!persisted) {
    return {
      run: {
        ...baseRun,
        status: "failed",
        message: "Не удалось сохранить задачу в localStorage.",
      },
    };
  }

  return {
    run: {
      ...baseRun,
      status: "executed",
      message:
        "Создана локальная демо-задача. Во внешние сервисы данные не отправлялись.",
    },
    task,
  };
}

export function persistRun(run: AutomationRun): boolean {
  const existing = readLocal<AutomationRun[]>(AUTOMATION_RUNS_KEY, []);
  const safeExisting = Array.isArray(existing) ? existing : [];

  return writeLocal(
    AUTOMATION_RUNS_KEY,
    [run, ...safeExisting].slice(0, 500),
  );
}