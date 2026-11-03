import Database from "better-sqlite3";
import { getSqliteDatabasePath } from "../lib/sqlite-path";

const db = new Database(getSqliteDatabasePath());

try {
  const userTable = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name = ?`
    )
    .get("User");

  if (!userTable) {
    throw new Error(
      'Таблица "User" не найдена. Сначала проверь схему базы данных.'
    );
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS "EmailBroadcast" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "totalCount" INTEGER NOT NULL,
      "sentCount" INTEGER NOT NULL,
      "failedCount" INTEGER NOT NULL,
      "skippedCount" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmailBroadcast_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User" ("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    );
  `);

  console.log("✅ Таблица EmailBroadcast проверена/создана.");
} catch (error) {
  console.error("❌ Ошибка создания EmailBroadcast:", error);
  process.exitCode = 1;
} finally {
  db.close();
}