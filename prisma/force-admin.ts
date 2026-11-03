import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

// Используем тот же путь, что и в lib/prisma.ts
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'pavel.pols@yandex.ru';
  const adminPassword = '18082009Pols!@#$';

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Используем upsert: если пользователь есть — обновляем, если нет — создаем
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
      role: 'ADMIN',
      name: 'Павел (Администратор)',
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
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