export function normalizeE164Phone(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const input = value.trim();

  if (!input || !/^\+[0-9\s()-]+$/.test(input)) {
    return null;
  }

  const phone = input.replace(/[\s()-]/g, "");

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return null;
  }

  return phone;
}