import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { getSqliteDatabasePath } from "../lib/sqlite-path";

const adapter = new PrismaBetterSqlite3({
  url: `file:${getSqliteDatabasePath()}`,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      name: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  console.log("\n=== ПОЛЬЗОВАТЕЛИ В ВЫБРАННОЙ БАЗЕ ===");

  for (const user of users) {
    console.log(
      `- ${user.email} | Роль: ${user.role} | Имя: ${user.name ?? "—"}`
    );
  }

  console.log("====================================\n");
}

main()
  .catch((error) => {
    console.error("❌ Ошибка проверки пользователей:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });