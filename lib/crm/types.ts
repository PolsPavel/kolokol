/**
 * Типы метаданных CRM-интеграций, которые интерфейс хранит в localStorage.
 *
 * Эти данные не являются серверными секретами и не подтверждают
 * фактическое подключение к внешней CRM.
 */

export type IntegrationType =
  | "bitrix24"
  | "amocrm"
  | "webhook"
  | "sheets";

export type Integration = {
  id: string;
  name: string;
  type: IntegrationType;
  url: string;
  isActive: boolean;
  createdAt: string;

  /**
   * Старые записи localStorage могли содержать token.
   * Новая страница интеграций не сохраняет это поле.
   */
  token?: string;
};

export const INTEGRATIONS_STORAGE_KEY = "voicepilot_integrations";

export const CRM_NAMES: Record<IntegrationType, string> = {
  bitrix24: "Bitrix24",
  amocrm: "amoCRM",
  webhook: "Custom Webhook",
  sheets: "Google Sheets",
};

export const CRM_LOGOS: Record<IntegrationType, string> = {
  bitrix24: "B",
  amocrm: "A",
  webhook: "D",
  sheets: "S",
};