// prisma/force-admin.ts
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';

// ЖЕСТКО ЗАДАЕМ ПУТЬ К БАЗЕ (в корне проекта)
const dbPath = path.resolve(process.cwd(), 'dev.db');
console.log('Используется база данных:', dbPath);

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'pavel.pols@yandex.ru';
  const adminPassword = '18082009Pols!@#$';

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
      temporaryPassword: adminPassword,
      role: 'ADMIN',
      name: 'Павел (Администратор)',
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      temporaryPassword: adminPassword,
      name: 'Павел (Администратор)',
      role: 'ADMIN',
      monthlyLimit: 999999,
    },
  });

  console.log('✅ Администратор успешно создан или обновлен!');
  console.log(`Логин: ${user.email}`);
  console.log(`Роль: ${user.role}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });