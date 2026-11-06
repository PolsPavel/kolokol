import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

// Подключаемся к нашей базе данных
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const newEmail = 'pavelpols@gmail.com';
  const newPassword = '18082009Pols!';

  console.log('🔄 Хеширование нового пароля...');
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // 1. Создаем или обновляем администратора с новым email
  const admin = await prisma.user.upsert({
    where: { email: newEmail },
    update: {
      passwordHash: hashedPassword,
      role: 'ADMIN',
      name: 'Павел (Администратор)',
    },
    create: {
      email: newEmail,
      passwordHash: hashedPassword,
      name: 'Павел (Администратор)',
      role: 'ADMIN',
      monthlyLimit: 0, // У админа лимита нет
    },
  });

  console.log('✅ Новый администратор успешно создан/обновлен!');
  console.log(`Логин: ${admin.email}`);
  console.log(`Пароль: ${newPassword}`);

  // 2. Удаляем старого администратора (для чистоты)
  const oldEmail = 'pavel.pols@yandex.ru';
  const oldAdmin = await prisma.user.findUnique({ where: { email: oldEmail } });
  
  if (oldAdmin) {
    await prisma.user.delete({ where: { email: oldEmail } });
    console.log(`🗑️ Старый аккаунт (${oldEmail}) успешно удален.`);
  } else {
    console.log(`ℹ️ Старого аккаунта (${oldEmail}) в базе не найдено.`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при обновлении:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });