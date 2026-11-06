import Database from "better-sqlite3";
import { getSqliteDatabasePath } from "../lib/sqlite-path";

const db = new Database(getSqliteDatabasePath());

try {
  const table = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name = ?`
    )
    .get("User");

  if (!table) {
    throw new Error(
      'Таблица "User" не найдена. Проверь DATABASE_URL и схему базы.'
    );
  }

  const existingColumns = new Set(
    (
      db.prepare('PRAGMA table_info("User")').all() as Array<{
        name: string;
      }>
    ).map((column) => column.name)
  );

  const columnsToAdd: Array<[string, string]> = [
    ["offerAcceptedAt", "DATETIME"],
    ["offerVersion", "TEXT"],
    ["offerAcceptedIp", "TEXT"],
  ];

  for (const [name, type] of columnsToAdd) {
    if (existingColumns.has(name)) {
      console.log(`ℹ️ Колонка "${name}" уже существует.`);
      continue;
    }

    db.exec(`ALTER TABLE "User" ADD COLUMN "${name}" ${type}`);
    console.log(`✅ Добавлена колонка "${name}".`);
  }
} catch (error) {
  console.error("❌ Ошибка добавления юридических полей:", error);
  process.exitCode = 1;
} finally {
  db.close();
}