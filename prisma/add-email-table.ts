import Database from "better-sqlite3";
import { getSqliteDatabasePath } from "../lib/sqlite-path";

let db: Database.Database | undefined;

try {
  db = new Database(getSqliteDatabasePath());

  db.exec(`
    CREATE TABLE IF NOT EXISTS "Email" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "address" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'new',
      "source" TEXT,
      "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "Email_address_key"
      ON "Email"("address");
  `);

  console.log("✅ Таблица Email проверена/создана.");
} catch (error) {
  console.error("❌ Ошибка создания таблицы Email:", error);
  process.exitCode = 1;
} finally {
  db?.close();
}