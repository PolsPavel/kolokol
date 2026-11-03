import type { Automation, AutomationRun, DemoTask } from "./types";

export const AUTOMATIONS_KEY = "voicepilot_automations";
export const AUTOMATION_RUNS_KEY = "voicepilot_automation_runs";
export const DEMO_TASKS_KEY = "voicepilot_demo_tasks";

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadAutomations(): Automation[] {
  const value = readLocal<unknown>(AUTOMATIONS_KEY, []);
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is Automation => {
    if (!item || typeof item !== "object") return false;

    const candidate = item as Partial<Automation>;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.enabled !== "boolean" ||
      typeof candidate.createdAt !== "string" ||
      (candidate.event !== "manual_test" &&
        candidate.event !== "campaign_demo_completed")
    ) {
      return false;
    }

    const condition = candidate.condition;
    const action = candidate.action;

    const validCondition =
      Boolean(condition) &&
      (condition?.type === "always" ||
        (condition?.type === "phone_contains" &&
          typeof condition.value === "string"));

    const validAction =
      Boolean(action) &&
      ((action?.type === "create_task" &&
        typeof action.title === "string") ||
        (action?.type === "log_only" &&
          typeof action.message === "string"));

    return validCondition && validAction;
  });
}

export function loadRuns(): AutomationRun[] {
  const value = readLocal<unknown>(AUTOMATION_RUNS_KEY, []);
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is AutomationRun =>
      Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as AutomationRun).id === "string" &&
          typeof (item as AutomationRun).automationId === "string" &&
          typeof (item as AutomationRun).createdAt === "string",
      ),
  );
}

export function loadTasks(): DemoTask[] {
  const value = readLocal<unknown>(DEMO_TASKS_KEY, []);
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is DemoTask =>
      Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as DemoTask).id === "string" &&
          typeof (item as DemoTask).title === "string",
      ),
  );
}