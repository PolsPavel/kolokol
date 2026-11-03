import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function main() {
  if (process.env.ALLOW_DATABASE_RESET !== "true") {
    throw new Error(
      "Сброс заблокирован. Для осознанного сброса задайте ALLOW_DATABASE_RESET=true."
    );
  }

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 12
  ) {
    throw new Error(
      "Задайте корректный INITIAL_ADMIN_EMAIL и INITIAL_ADMIN_PASSWORD не менее 12 символов."
    );
  }

  const url = process.env.DATABASE_URL || "file:./dev.db";

  if (!url.startsWith("file:")) {
    throw new Error("Скрипт сброса предназначен только для SQLite DATABASE_URL.");
  }

  const dbFile = url.slice(5);

  const adapter = new PrismaBetterSqlite3({
    url: `file:${path.resolve(process.cwd(), dbFile)}`,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('DELETE FROM "ImpersonationToken"');
      await tx.$executeRawUnsafe('DELETE FROM "SmsVerification"');
      await tx.$executeRawUnsafe('DELETE FROM "Payment"');

      await tx.transaction.deleteMany();
      await tx.emailBroadcast.deleteMany();
      await tx.user.deleteMany();

      await tx.user.create({
        data: {
          email,
          passwordHash,
          name: "Администратор",
          role: "ADMIN",
          emailVerified: new Date(),
          hasLoggedIn: true,
        },
      });
    });

    console.log(
      "База сброшена; новый администратор создан. Пароль не выводится."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Ошибка сброса:", error);
  process.exitCode = 1;
});