import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";

export function getSqliteDatabasePath(): string {
  const configuredUrl = process.env.DATABASE_URL || "file:./dev.db";

  if (!configuredUrl.startsWith("file:")) {
    throw new Error(
      "Ожидался SQLite DATABASE_URL с префиксом file:."
    );
  }

  const rawPathWithQuery = configuredUrl.slice("file:".length);
  const queryIndex = rawPathWithQuery.indexOf("?");
  const rawPath =
    queryIndex === -1
      ? rawPathWithQuery
      : rawPathWithQuery.slice(0, queryIndex);

  if (!rawPath.trim()) {
    throw new Error("В DATABASE_URL не указан путь к SQLite-файлу.");
  }

  const absolutePath = path.isAbsolute(rawPath)
    ? path.normalize(rawPath)
    : path.resolve(process.cwd(), rawPath);

  if (!existsSync(absolutePath)) {
    throw new Error(
      `Файл базы данных не найден: ${absolutePath}. ` +
      "Проверь DATABASE_URL. Новый файл автоматически не создаётся."
    );
  }

  return absolutePath;
}