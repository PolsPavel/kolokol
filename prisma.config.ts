import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

function resolveDatabaseUrl(): string {
  const configuredUrl = process.env.DATABASE_URL || "file:./dev.db";

  if (!configuredUrl.startsWith("file:")) {
    throw new Error(
      "Для текущей SQLite-схемы DATABASE_URL должен начинаться с file:."
    );
  }

  const value = configuredUrl.slice("file:".length);
  const queryIndex = value.indexOf("?");
  const rawPath = queryIndex === -1 ? value : value.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : value.slice(queryIndex);

  if (!rawPath.trim()) {
    throw new Error("DATABASE_URL не содержит путь к SQLite-файлу.");
  }

  const absolutePath = path.isAbsolute(rawPath)
    ? path.normalize(rawPath)
    : path.resolve(process.cwd(), rawPath);

  return `file:${absolutePath.replace(/\\/g, "/")}${query}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: resolveDatabaseUrl(),
  },
});