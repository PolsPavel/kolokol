import Database from "better-sqlite3";
import { getSqliteDatabasePath } from "../lib/sqlite-path";

const db = new Database(getSqliteDatabasePath());

try {
  const table = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name = ?`
    )
    .get("EmailBroadcast");

  if (!table) {
    throw new Error(
      'Таблица "EmailBroadcast" не найдена. Сначала создай её.'
    );
  }

  const columns = db
    .prepare('PRAGMA table_info("EmailBroadcast")')
    .all() as Array<{ name: string }>;

  if (columns.some((column) => column.name === "details")) {
    console.log('ℹ️ Колонка "details" уже существует.');
  } else {
    db.exec(
      'ALTER TABLE "EmailBroadcast" ADD COLUMN "details" TEXT'
    );

    console.log('✅ Колонка "details" добавлена.');
  }
} catch (error) {
  console.error("❌ Ошибка добавления колонки details:", error);
  process.exitCode = 1;
} finally {
  db.close();
}