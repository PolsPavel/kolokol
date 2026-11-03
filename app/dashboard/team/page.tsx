// app/dashboard/team/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { SessionTimer } from "@/components/SessionTimer";

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

function toLocalDateTimeInput(value: string | null): string {
  const date = value ? new Date(value) : new Date(Date.now() + 86400000);
  if (isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const isFetchingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUsers = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Не удалось загрузить пользователей."));
      }

      if (!Array.isArray(data) || !data.every(isTeamUser)) {
        throw new Error("Сервер вернул данные в неверном формате.");
      }

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
    intervalRef.current = setInterval(fetchUsers, 15000);

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

      const invitationSent = isRecord(data) && data.invitationSent === true;
      const tempPass = isRecord(data) && typeof data.temporaryPassword === "string" ? data.temporaryPassword : "";

      setMessage({
        text: invitationSent
          ? "Приглашение успешно отправлено на почту."
          : `Аккаунт создан, но письмо не отправлено. ${tempPass ? `Временный пароль: ${tempPass}` : "Проверьте настройки SMTP."}`,
        type: invitationSent ? "success" : "error",
      });

      setName("");
      setEmail("");
      setRole("USER");
      setLimit(5000);
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
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(getApiError(data, "Ошибка архивирования."));
        return;
      }
      setMessage({ text: "Пользователь перемещён в архив.", type: "success" });
      await fetchUsers();
    } catch {
      alert("Ошибка соединения.");
    }
  };

  const handleSaveAccess = async (id: string) => {
    let isoDate: string | null = null;
    if (editValue) {
      const date = new Date(editValue);
      if (isNaN(date.getTime())) {
        alert("Укажите корректную дату.");
        return;
      }
      isoDate = date.toISOString();
    }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessExpiresAt: isoDate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(getApiError(data, "Ошибка сохранения."));
        return;
      }
      setEditingId(null);
      setEditValue("");
      setMessage({ text: "Время доступа обновлено.", type: "success" });
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
      const data = await res.json().catch(() => null);

      if (!res.ok || !isRecord(data) || typeof data.token !== "string") {
        alert(getApiError(data, "Ошибка переключения."));
        return;
      }

      await signIn("impersonate", {
        token: data.token,
        adminId: session?.user?.id,
        redirect: true,
        callbackUrl: "/dashboard",
      });
    } catch {
      alert("Ошибка соединения.");
    }
  };

  if (sessionStatus === "loading") {
    return <div className="p-8 text-center text-gray-400">Проверка доступа...</div>;
  }

  if (session?.user?.role !== "ADMIN") {
    return <div className="p-8 text-center text-red-500">У вас нет прав.</div>;
  }

  const displayedUsers = users.filter((u) => (showArchive ? u.isDeleted : !u.isDeleted));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Команда и доступ</h2>
          <p className="text-sm text-gray-400">Управление сотрудниками и временем доступа</p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-[#FACC15] hover:text-yellow-400">
          ← На дашборд
        </Link>
      </div>

      {message.text && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-900/30 text-green-400" : "border-red-800 bg-red-900/30 text-red-400"}`}>
          <div className="flex justify-between gap-3">
            <p className="break-words">{message.text}</p>
            <button onClick={() => setMessage({ text: "", type: "" })} className="shrink-0">✕</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
              <h3 className="text-lg font-semibold text-white">
                {showArchive ? "Архив пользователей" : "Активные сотрудники"}
              </h3>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" checked={showArchive} onChange={(e) => setShowArchive(e.target.checked)} className="accent-[#FACC15]" />
                Показать архив
              </label>
            </div>

            {isLoading ? (
              <p className="text-gray-400">Загрузка...</p>
            ) : displayedUsers.length === 0 ? (
              <p className="text-gray-500">{showArchive ? "Архив пуст." : "Сотрудников пока нет."}</p>
            ) : (
              <div className="space-y-3">
                {displayedUsers.map((user) => {
                  const isEditing = editingId === user.id;
                  return (
                    <div key={user.id} className={`flex flex-col gap-3 rounded-lg border border-gray-800 bg-black/40 p-4 ${user.isDeleted ? "opacity-70" : ""}`}>
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words font-bold text-white">{user.name || "Без имени"}</p>
                            {user.isDeleted && <span className="rounded bg-red-900/50 px-2 py-0.5 text-xs text-red-400">В архиве</span>}
                          </div>
                          <p className="break-all text-sm text-gray-400">{user.email}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Лимит: {formatMoney(user.monthlyLimit)} ₽ · Потрачено: {formatMoney(user.currentSpent)} ₽
                          </p>
                          <div className="mt-2 space-y-1 text-xs text-gray-400">
                            <p>Вход: {formatDate(user.lastLoginAt)}</p>
                            <p>Выход: {formatDate(user.lastLogoutAt)}</p>
                          </div>
                          {user.accessExpiresAt && (
                            <div className="mt-2">
                              <SessionTimer expiresAt={user.accessExpiresAt} isAdmin={user.role === "ADMIN"} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded border px-2.5 py-1 text-xs font-medium ${user.role === "ADMIN" ? "border-red-900/50 bg-red-900/30 text-red-400" : "border-green-900/50 bg-green-900/30 text-green-400"}`}>
                            {user.role === "ADMIN" ? "Администратор" : "Менеджер"}
                          </span>
                          {user.id !== session?.user?.id && !user.isDeleted && (
                            <>
                              <button onClick={() => handleImpersonate(user.id)} className="rounded bg-blue-900/20 p-1.5 text-blue-400 hover:bg-blue-900/40" title="Войти как пользователь">👁️</button>
                              <button onClick={() => handleDelete(user.id)} className="rounded bg-red-900/20 p-1.5 text-red-400 hover:bg-red-900/40" title="В архив">🗑️</button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Блок изменения времени доступа */}
                      {!user.isDeleted && user.role !== "ADMIN" && (
                        <div className="border-t border-gray-800 pt-3">
                          {isEditing ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="datetime-local"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="rounded-lg border border-gray-700 bg-black/50 px-3 py-1.5 text-sm text-white"
                              />
                              <button onClick={() => handleSaveAccess(user.id)} className="rounded-lg bg-[#FACC15] px-3 py-1.5 text-sm font-bold text-black">Сохранить</button>
                              <button onClick={() => { setEditingId(null); setEditValue(""); }} className="px-3 py-1.5 text-sm text-gray-400">Отмена</button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingId(user.id); setEditValue(toLocalDateTimeInput(user.accessExpiresAt)); }} className="text-xs font-medium text-[#FACC15] hover:text-yellow-400">
                              ⏱️ Изменить время доступа
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={fetchUsers} disabled={isLoading} className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50">
                Обновить список
              </button>
            </div>
          </div>
        </div>

        <div className="h-fit rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
          <h3 className="mb-4 border-b border-gray-800 pb-3 text-lg font-semibold text-white">Добавить сотрудника</h3>
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
              <label className="mb-1 block text-sm text-gray-300">Лимит, ₽</label>
              <input type="number" min="0" step="0.01" value={limit} onChange={(e) => setLimit(Number(e.target.value))} required className="w-full rounded-lg border border-gray-700 bg-black/50 p-2 text-white" />
            </div>
            <button type="submit" disabled={isCreating} className="w-full rounded-lg bg-[#FACC15] py-3 font-bold text-black hover:bg-yellow-400 disabled:opacity-50">
              {isCreating ? "Создание..." : "Пригласить"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}