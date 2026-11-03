import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const dbFile = databaseUrl.startsWith("file:")
  ? databaseUrl.slice(5)
  : databaseUrl;

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.resolve(process.cwd(), dbFile)}`,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error(
      "Задайте INITIAL_ADMIN_EMAIL и INITIAL_ADMIN_PASSWORD (не менее 12 символов) в защищённом окружении."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== "ADMIN") {
      throw new Error(
        "Указанный email уже принадлежит не-администратору; автоматическое повышение запрещено."
      );
    }

    console.log("Администратор уже существует. Учётная запись не изменена.");
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Администратор",
      role: "ADMIN",
      monthlyLimit: 0,
      currentSpent: 0,
      isDeleted: false,
      emailVerified: new Date(),
      hasLoggedIn: true,
      accessExpiresAt: null,
    },
  });

  console.log("Администратор создан. Пароль не выводится в журнал.");
}

main()
  .catch((error) => {
    console.error("Ошибка seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });