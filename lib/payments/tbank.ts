import { createHash, timingSafeEqual } from "node:crypto";

type TBankFields = Record<string, unknown>;

export function createTBankToken(
  fields: TBankFields,
  password: string
): string {
  if (!password) {
    throw new Error("Не задан пароль терминала Т-Банка.");
  }

  const values: Record<string, string> = Object.create(null);

  for (const [key, value] of Object.entries(fields)) {
    if (
      key === "Token" ||
      key === "Data" ||
      key === "Receipt" ||
      value === null ||
      value === undefined ||
      typeof value === "object"
    ) {
      continue;
    }

    values[key] = String(value);
  }

  values.Password = password;

  const source = Object.keys(values)
    .sort()
    .map((key) => values[key])
    .join("");

  return createHash("sha256")
    .update(source, "utf8")
    .digest("hex");
}

export function verifyTBankToken(
  fields: TBankFields,
  password: string
): boolean {
  try {
    const token = fields.Token;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token) ||
      !password
    ) {
      return false;
    }

    const expected = Buffer.from(
      createTBankToken(fields, password),
      "hex"
    );

    const actual = Buffer.from(token, "hex");

    return (
      expected.length === actual.length &&
      timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}