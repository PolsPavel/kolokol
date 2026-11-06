import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { getSqliteDatabasePath } from "../lib/sqlite-path";

const adapter = new PrismaBetterSqlite3({
  url: `file:${getSqliteDatabasePath()}`,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.DELETE_USER_EMAIL?.trim();
  const confirmation = process.env.CONFIRM_DELETE_USER_EMAIL?.trim();

  if (!email || confirmation !== email) {
    throw new Error(
      "Удаление отменено. Укажи DELETE_USER_EMAIL и " +
        "CONFIRM_DELETE_USER_EMAIL с одинаковым адресом."
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    console.log("Пользователь не найден. База не изменена.");
    return;
  }

  if (user.role === "ADMIN") {
    throw new Error(
      "Удаление администратора через этот скрипт запрещено."
    );
  }

  const result = await prisma.user.deleteMany({
    where: {
      id: user.id,
      role: { not: "ADMIN" },
    },
  });

  if (result.count !== 1) {
    throw new Error(
      "Пользователь не удалён: запись могла измениться во время операции."
    );
  }

  console.log(`✅ Пользователь ${email} удалён.`);
}

main()
  .catch((error) => {
    console.error("❌ Удаление пользователя не выполнено:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });