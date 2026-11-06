"use strict";

async function main() {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const childProcess = await import("node:child_process");

  const projectRoot = path.resolve(__dirname, "..");

  process.chdir(projectRoot);

  function getDatabasePath() {
    const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

    if (!databaseUrl.startsWith("file:")) {
      throw new Error(
        "Этот скрипт поддерживает только SQLite DATABASE_URL с префиксом file:."
      );
    }

    const value = databaseUrl.slice("file:".length);
    const queryIndex = value.indexOf("?");
    const rawPath =
      queryIndex === -1 ? value : value.slice(0, queryIndex);

    if (!rawPath.trim()) {
      throw new Error(
        "В DATABASE_URL не указан путь к файлу базы."
      );
    }

    return path.isAbsolute(rawPath)
      ? path.resolve(rawPath)
      : path.resolve(projectRoot, rawPath);
  }

  if (process.env.CONFIRM_DB_MIGRATION !== "YES") {
    throw new Error(
      [
        "Миграция не запущена: отсутствует явное подтверждение.",
        "",
        "Перед запуском установите переменную окружения:",
        "CONFIRM_DB_MIGRATION=YES",
        "",
        "Пример для PowerShell:",
        '$env:CONFIRM_DB_MIGRATION = "YES"',
        "node prisma/migrate-voicepilot.cjs",
        "",
        "Перед изменением схемы скрипт создаст резервную копию базы данных.",
      ].join("\n")
    );
  }

  const databasePath = getDatabasePath();

  if (!fs.existsSync(databasePath)) {
    throw new Error(
      [
        `База не найдена: ${databasePath}`,
        "Автоматическое создание новой базы запрещено этим скриптом.",
      ].join("\n")
    );
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const backupPath = `${databasePath}.backup-${timestamp}`;

  fs.copyFileSync(databasePath, backupPath);

  console.log(`Резервная копия создана: ${backupPath}`);
  console.log("Запускаю Prisma db push без --accept-data-loss...");

  const command =
    process.platform === "win32" ? "npx.cmd" : "npx";

  const result = childProcess.spawnSync(
    command,
    [
      "prisma",
      "db",
      "push",
      "--schema",
      "prisma/schema.prisma",
    ],
    {
      cwd: projectRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    }
  );

  if (result.error) {
    throw new Error(
      `Не удалось запустить Prisma: ${result.error.message}\n` +
        `Резервная копия сохранена: ${backupPath}`
    );
  }

  if (result.status !== 0) {
    const exitCode =
      result.status === null
        ? `процесс завершился по сигналу ${result.signal ?? "unknown"}`
        : `код ${result.status}`;

    throw new Error(
      `Prisma db push завершился с ошибкой: ${exitCode}.\n` +
        `Резервная копия сохранена: ${backupPath}`
    );
  }

  console.log("Схема Prisma синхронизирована.");
  console.log(`Резервная копия: ${backupPath}`);
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : String(error);

  console.error("Ошибка локальной миграции:", message);
  process.exitCode = 1;
});
