// app/dashboard/team/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "USER";
  monthlyLimit: number;
  currentSpent: number;
  accessExpiresAt: string | null;
  isDeleted: boolean;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  temporaryPassword?: string | null;
  hasLoggedIn?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTeamUser(value: unknown): value is TeamUser {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (typeof value.name === "string" || value.name === null) &&
    typeof value.email === "string" &&
    (value.role === "ADMIN" || value.role === "USER") &&
    typeof value.monthlyLimit === "number" &&
    typeof value.currentSpent === "number" &&
    (typeof value.accessExpiresAt === "string" || value.accessExpiresAt === null) &&
    typeof value.isDeleted === "boolean" &&
    (typeof value.lastLoginAt === "string" || value.lastLoginAt === null) &&
    (typeof value.lastLogoutAt === "string" || value.lastLogoutAt === null)
  );
}

function getApiError(data: unknown, fallback: string): string {
  if (isRecord(data) && typeof data.error === "string") return data.error;
  return fallback;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);
}

export default function TeamPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [limit, setLimit] = useState(5000);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isCreating, setIsCreating] = useState(false);

  const [balanceModalUserId, setBalanceModalUserId] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");

  const isFetchingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUsers = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) throw new Error(getApiError(data, "Не удалось загрузить пользователей."));
      if (!Array.isArray(data) || !data.every(isTeamUser)) throw new Error("Сервер вернул неверный формат.");

      setUsers(data);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (session?.user?.role !== "ADMIN") return;

    fetchUsers();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchUsers, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionStatus, session?.user?.role, fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !Number.isFinite(limit) || limit < 0) {
      setMessage({ text: "Проверьте введённые данные.", type: "error" });
      return;
    }

    setIsCreating(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role, monthlyLimit: limit }),
      });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage({ text: getApiError(data, "Ошибка создания."), type: "error" });
        return;
      }

      setMessage({ text: `Аккаунт создан. Пароль: ${isRecord(data) ? data.temporaryPassword : ""}`, type: "success" });
      setName(""); setEmail(""); setRole("USER"); setLimit(5000);
      await fetchUsers();
    } catch (error) {
      setMessage({ text: "Ошибка соединения.", type: "error" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Переместить пользователя в архив?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessage({ text: "Пользователь перемещён в архив.", type: "success" });
      await fetchUsers();
    } catch {
      alert("Ошибка соединения.");
    }
  };

  const handleImpersonate = async (userId: string) => {
    if (!confirm("Войти в систему от имени этого пользователя?")) return;
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error();
      await signIn("impersonate", { token: data.token, adminId: session?.user?.id, redirect: true, callbackUrl: "/dashboard" });
    } catch {
      alert("Ошибка переключения.");
    }
  };

  const handleDownloadCredentials = async (userId: string, email: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/credentials`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Kolokol_${email}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Ошибка скачивания.");
    }
  };

  const handleSendCredentials = async (userId: string) => {
    if (!confirm("Отправить данные для входа на почту?")) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/credentials`, { method: "POST" });
      if (!res.ok) throw new Error();
      alert("Данные отправлены.");
    } catch {
      alert("Ошибка отправки.");
    }
  };

  const handleAdjustBalance = async () => {
    if (!balanceModalUserId) return;
    const amountNum = parseFloat(balanceAmount);
    if (isNaN(amountNum) || amountNum === 0) {
      alert("Введите ненулевую сумму.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${balanceModalUserId}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка изменения баланса.");
        return;
      }
      setBalanceModalUserId(null);
      setBalanceAmount("");
      await fetchUsers();
    } catch {
      alert("Ошибка соединения.");
    }
  };

  if (sessionStatus === "loading") return <div className="p-8 text-center text-gray-400">Проверка доступа...</div>;
  if (session?.user?.role !== "ADMIN") return <div className="p-8 text-center text-red-500">У вас нет прав.</div>;

  const displayedUsers = users.filter((u) => (showArchive ? u.isDeleted : !u.isDeleted));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Команда и доступ</h2>
          <p className="text-sm text-gray-400">Управление сотрудниками и временем доступа</p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-[#FACC15] hover:text-yellow-400">← На дашборд</Link>
      </div>

      {message.text && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-900/30 text-green-400" : "border-red-800 bg-red-900/30 text-red-400"}`}>
          <div className="flex justify-between gap-3">
            <p>{message.text}</p>
            <button onClick={() => setMessage({ text: "", type: "" })}>✕</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
            <div className="mb-4 flex justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-semibold text-white">{showArchive ? "Архив" : "Активные аккаунты"}</h3>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" checked={showArchive} onChange={(e) => setShowArchive(e.target.checked)} className="accent-[#FACC15]" />
                Показать архив
              </label>
            </div>

            {isLoading ? <p className="text-gray-400">Загрузка...</p> : displayedUsers.length === 0 ? <p className="text-gray-500">Аккаунтов нет.</p> : (
              <div className="space-y-3">
                {displayedUsers.map((user) => (
                  <div key={user.id} className="rounded-lg border border-gray-800 bg-black/40 p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-white">{user.name || "Без имени"}</p>
                        <div className="mt-1 rounded bg-black/30 p-2 text-xs font-mono text-gray-300">
                          <p><span className="text-gray-500">Логин:</span> {user.email}</p>
                          <p><span className="text-gray-500">Пароль:</span> {user.temporaryPassword || "скрыт"}</p>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Лимит: <span className="text-white font-semibold">{formatMoney(user.monthlyLimit)} ₽</span> · Потрачено: {formatMoney(user.currentSpent)} ₽
                        </p>
                        <div className="mt-1 text-xs text-gray-400">
                          <p>Вход: {formatDate(user.lastLoginAt)}</p>
                          <p>Выход: {formatDate(user.lastLogoutAt)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 items-start">
                        <span className={`rounded border px-2 py-0.5 text-xs ${user.role === "ADMIN" ? "border-red-900/50 text-red-400" : "border-green-900/50 text-green-400"}`}>
                          {user.role === "ADMIN" ? "Админ" : "Менеджер"}
                        </span>
                        {user.id !== session?.user?.id && !user.isDeleted && (
                          <>
                            <button onClick={() => setBalanceModalUserId(user.id)} className="rounded bg-yellow-900/20 p-1.5 text-yellow-400 hover:bg-yellow-900/40" title="Изменить баланс">💰</button>
                            <button onClick={() => handleImpersonate(user.id)} className="rounded bg-blue-900/20 p-1.5 text-blue-400 hover:bg-blue-900/40" title="Войти как пользователь">👁️</button>
                            <button onClick={() => handleDelete(user.id)} className="rounded bg-red-900/20 p-1.5 text-red-400 hover:bg-red-900/40" title="В архив">🗑️</button>
                            {user.temporaryPassword && (
                              <>
                                <button onClick={() => handleDownloadCredentials(user.id, user.email)} className="rounded bg-green-900/20 p-1.5 text-green-400 hover:bg-green-900/40" title="Скачать доступы">📄</button>
                                <button onClick={() => handleSendCredentials(user.id)} className="rounded bg-yellow-900/20 p-1.5 text-yellow-400 hover:bg-yellow-900/40" title="Отправить доступы">✉️</button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={fetchUsers} disabled={isLoading} className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50">Обновить список</button>
            </div>
          </div>
        </div>

        <div className="h-fit rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
          <h3 className="mb-4 border-b border-gray-800 pb-3 text-lg font-semibold text-white">Создать аккаунт</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Имя</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} className="w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} className="w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Роль</label>
              <select value={role} onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")} className="w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white">
                <option value="USER">Менеджер</option>
                <option value="ADMIN">Администратор</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Бюджет, ₽</label>
              <input type="number" min="0" step="0.01" value={limit} onChange={(e) => setLimit(Number(e.target.value))} required className="w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white" />
            </div>
            <button type="submit" disabled={isCreating} className="w-full rounded-lg bg-[#FACC15] py-3 font-bold text-black hover:bg-yellow-400 disabled:opacity-50">
              {isCreating ? "Создание..." : "Создать аккаунт"}
            </button>
          </form>
        </div>
      </div>

      {balanceModalUserId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-white">Изменить баланс</h3>
            <p className="text-sm text-gray-400">Введите сумму (положительную для начисления, отрицательную для списания).</p>
            <input
              type="number"
              step="0.01"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              placeholder="Например: 1000 или -500"
              className="w-full rounded-lg border border-gray-700 bg-black/50 p-3 text-white"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setBalanceModalUserId(null)} className="px-4 py-2 text-gray-400">Отмена</button>
              <button onClick={handleAdjustBalance} className="bg-[#FACC15] px-4 py-2 rounded-lg font-bold text-black">Применить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}