import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

type TBankFields = Record<
  string,
  string | number | boolean | null | undefined | object
>;

export function createTBankToken(
  fields: TBankFields,
  password: string
): string {
  const values: Record<string, string> = {};

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
  if (typeof fields.Token !== "string") return false;

  const expected = Buffer.from(
    createTBankToken(fields, password),
    "hex"
  );

  const actual = Buffer.from(fields.Token, "hex");

  return (
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
}