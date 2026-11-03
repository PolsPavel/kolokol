import Database from "better-sqlite3";
import { getSqliteDatabasePath } from "../lib/sqlite-path";

const db = new Database(getSqliteDatabasePath());

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "Unsubscribe" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "reason" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "Unsubscribe_email_key"
      ON "Unsubscribe"("email");
  `);

  console.log("✅ Таблица Unsubscribe и уникальный индекс проверены/созданы.");
} catch (error) {
  console.error("❌ Ошибка создания таблицы Unsubscribe:", error);
  process.exitCode = 1;
} finally {
  db.close();
}