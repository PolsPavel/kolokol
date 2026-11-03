// app/dashboard/layout.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { SessionTimer } from "@/components/SessionTimer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isImpersonating = Boolean((session?.user as any)?.originalAdminId);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const handleReturnToAdmin = async () => {
    try {
      const res = await fetch("/api/admin/return", { method: "POST" });
      if (!res.ok) { alert("Ошибка возврата."); return; }
      const data = await res.json();
      if (!data.token) { alert(data.error || "Нет токена."); return; }
      await signIn("impersonate", { token: data.token, adminId: "", redirect: true, callbackUrl: "/dashboard/team" });
    } catch { alert("Ошибка соединения."); }
  };

  const user = session?.user;

  const navItems = [
    { name: "Стоимость", path: "/dashboard" },
    { name: "Инструкции", path: "/dashboard/instructions" },
    { name: "Кампании обзвона", path: "/dashboard/campaigns" },
    { name: "Журнал звонков", path: "/dashboard/history" },
    { name: "Рассылки (SMS/WA/TG)", path: "/dashboard/messengers" },
    { name: "Email-рассылки", path: "/dashboard/email" },
    { name: "Отчеты", path: "/dashboard/reports" },
    { name: "Парсинг", path: "/dashboard/parser" },
    { name: "Контакты", path: "/dashboard/contacts" },
    { name: "Аудиоролики", path: "/dashboard/audio" },
    { name: "Телефония", path: "/dashboard/telephony" },
    { name: "Роботы", path: "/dashboard/robots" },
    { name: "Аналитика", path: "/dashboard/analytics" },
    { name: "Настройки", path: "/dashboard/settings" },
  ];

  if (user?.role === "ADMIN" && !isImpersonating) {
    navItems.push(
      { name: "Интеграции", path: "/dashboard/integrations" },
      { name: "Команда и доступ", path: "/dashboard/team" },
      { name: "Админ-панель", path: "/dashboard/admin" }
    );
  }

  if (status === "loading") return <div className="h-screen flex items-center justify-center text-white bg-[#0a0a0a]">Загрузка...</div>;
  if (status === "unauthenticated") return <div className="h-screen flex items-center justify-center text-gray-400 bg-[#0a0a0a]">Редирект...</div>;

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden font-serif flex-col">
      {isImpersonating && (
        <div className="bg-[#FACC15] text-black px-4 py-2 flex justify-between items-center text-sm font-bold z-50 shrink-0">
          <span>Вы в аккаунте: {user?.name} ({user?.email})</span>
          <button onClick={handleReturnToAdmin} className="bg-black text-white px-3 py-1 rounded">Вернуться в админку</button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        {isMobileMenuOpen && <div className="fixed inset-0 bg-black/70 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
        <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#1f1f1f] text-white flex flex-col transition-transform duration-300 border-r border-gray-800 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-[#FACC15]">
              <div className="w-8 h-8 bg-[#FACC15] rounded-lg flex items-center justify-center text-black text-lg">K</div>
              KoloKol
            </Link>
            <button className="md:hidden text-gray-400" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== "/dashboard" && pathname?.startsWith(item.path));
              return (
                <Link key={item.path} href={item.path} onClick={() => setIsMobileMenuOpen(false)} className={`block px-4 py-2.5 rounded-lg transition ${isActive ? "bg-[#FACC15] text-black font-bold" : "text-gray-300 hover:bg-gray-800"}`}>
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FACC15] flex items-center justify-center text-black font-bold uppercase">{user?.name?.[0] || "U"}</div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{user?.name || "Пользователь"}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-400">Выйти</button>
            </div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-[#1f1f1f] border-b border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0">
            <div className="flex items-center gap-3 md:hidden">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
              <span className="font-bold text-white">KoloKol</span>
            </div>
            <h1 className="text-xl font-semibold text-white hidden md:block">Панель управления</h1>
            <div className="flex items-center space-x-4">
              <SessionTimer expiresAt={(user as any)?.accessExpiresAt ?? null} isAdmin={user?.role === "ADMIN"} />
              <span className="text-sm text-gray-400 hidden sm:inline">{user?.role === "ADMIN" ? "Администратор" : "Менеджер"}</span>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6 overflow-auto relative">
            <div className="relative z-10">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}