// lib/demo-mode.ts

// Принудительно отключаем демо-режим
export async function isDemoMode() {
  return false;
}

export async function getDemoUserId() {
  return null;
}

// Ключи для локального хранилища (восстановлены для совместимости)
export const STORAGE_KEYS = {
  contacts: "voicepilot_contacts",
  messages: "voicepilot_messages",
  sipNumbers: "voicepilot_sip_numbers",
  callLog: "voicepilot_call_log",
  integrations: "voicepilot_integrations",
} as const;

// Генератор ID
export function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Чтение и запись JSON
export function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Типы для страниц
export type IntegrationType = "bitrix24" | "amocrm" | "webhook" | "sheets";

export type LocalIntegration = {
  id: string;
  name: string;
  type: IntegrationType;
  portalUrl: string;
  isActive: boolean;
  mode: "demo";
  createdAt: string;
};

export type DemoMessageRecord = {
  id: string;
  channel: "sms" | "whatsapp" | "telegram";
  recipient: string;
  text: string;
  status: string;
  createdAt: string;
  note?: string;
};

export type DemoCallRecord = {
  id: string;
  phone: string;
  callerId: string;
  status: "simulated";
  createdAt: string;
  note: string;
};