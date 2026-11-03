import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { getSqliteDatabasePath } from "../lib/sqlite-path";

const adapter = new PrismaBetterSqlite3({
  url: `file:${getSqliteDatabasePath()}`,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.CONFIRM_DELETE_NON_ADMIN_USERS !== "YES") {
    throw new Error(
      "Удаление отменено. Для подтверждения установи " +
        "CONFIRM_DELETE_NON_ADMIN_USERS=YES."
    );
  }

  const count = await prisma.user.count({
    where: {
      role: { not: "ADMIN" },
    },
  });

  console.log(`Пользователей к удалению: ${count}`);

  if (count === 0) {
    console.log("Удалять нечего.");
    return;
  }

  const result = await prisma.user.deleteMany({
    where: {
      role: { not: "ADMIN" },
    },
  });

  console.log(`✅ Удалено пользователей: ${result.count}`);
}

main()
  .catch((error) => {
    console.error("❌ Очистка пользователей не выполнена:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });