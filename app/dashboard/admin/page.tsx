'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { data: session } = useSession();

  if (session?.user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-500">Доступ запрещен.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Панель Администратора</h2>
        <Link href="/dashboard" className="text-sm text-[#FACC15] hover:text-yellow-400 font-medium">← На дашборд</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/team" className="block bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 hover:border-[#FACC15]/50 transition">
          <h3 className="text-xl font-bold text-white mb-2">👥 Управление командой</h3>
          <p className="text-gray-400">Добавляйте сотрудников, назначайте им роли и устанавливайте лимиты расходов.</p>
        </Link>

        <Link href="/dashboard/integrations" className="block bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 hover:border-[#FACC15]/50 transition">
          <h3 className="text-xl font-bold text-white mb-2">🔗 Интеграции</h3>
          <p className="text-gray-400">Настройте вебхуки для CRM (Bitrix24, amoCRM) и получайте лиды напрямую.</p>
        </Link>

        <div className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-white mb-2">⚙️ Системная информация</h3>
          <p className="text-gray-400 mb-4">Текущие настройки проекта.</p>
          <ul className="text-sm text-gray-300 space-y-2">
            <li><b>Вы вошли как:</b> {session.user.name} ({session.user.email})</li>
            <li><b>Ваша роль:</b> <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-900/50">ADMIN</span></li>
            <li><b>База данных:</b> SQLite (Prisma)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}