
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
};

type AnalyticsData = {
  phone: string | null;
  phoneVerified: boolean;
  balance: number | null;
  monthlyLimit: number;
  totalSpent: number;
  transactions: Transaction[];
  email: {
    total: number;
    sent: number;
    failed: number;
  };
};

type ApiMessage = {
  message?: string;
  error?: string;
  paymentUrl?: string;
  phone?: string | null;
  phoneVerified?: boolean;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("1000");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/analytics", {
        cache: "no-store",
      });

      const result = (await response.json()) as AnalyticsData | ApiMessage;

      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error || "Не удалось загрузить аналитику"
            : "Не удалось загрузить аналитику",
        );
      }

      const analytics = result as AnalyticsData;

      setData(analytics);
      setPhone((current) => current || analytics.phone || "");
    } catch (error) {
      console.error("Ошибка загрузки аналитики:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить аналитику",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        const response = await fetch("/api/analytics", {
          cache: "no-store",
        });

        const result = (await response.json()) as
          | AnalyticsData
          | ApiMessage;

        if (!response.ok) {
          throw new Error(
            "error" in result
              ? result.error || "Не удалось загрузить аналитику"
              : "Не удалось загрузить аналитику",
          );
        }

        if (cancelled) return;

        const analytics = result as AnalyticsData;

        setData(analytics);
        setPhone((current) => current || analytics.phone || "");
      } catch (error) {
        if (!cancelled) {
          console.error("Ошибка загрузки аналитики:", error);
          setMessage("Не удалось загрузить аналитику");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestCode = async () => {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const result = (await response.json()) as ApiMessage;

      if (!response.ok) {
        throw new Error(result.error || "Не удалось отправить код");
      }

      setMessage(result.message || "Код отправлен");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ошибка отправки SMS",
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const normalizedPhone = phone.startsWith("+")
      ? `+${phone.replace(/\D/g, "")}`
      : `+${phone.replace(/\D/g, "")}`;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          code,
        }),
      });

      const result = (await response.json()) as ApiMessage;

      if (!response.ok) {
        throw new Error(result.error || "Не удалось подтвердить номер");
      }

      setData((current) =>
        current
          ? {
              ...current,
              phone: normalizedPhone,
              phoneVerified: true,
            }
          : current,
      );

      setPhone(normalizedPhone);
      setCode("");
      setMessage(result.message || "Номер телефона подтверждён");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ошибка подтверждения номера",
      );
    } finally {
      setBusy(false);
    }
  };

  const createPayment = async () => {
    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 100 ||
      numericAmount > 100000
    ) {
      setMessage("Сумма должна быть от 100 до 100 000 ₽");
      return;
    }

    if (
      data?.balance !== null &&
      data?.phoneVerified !== true
    ) {
      setMessage("Перед пополнением подтвердите номер телефона");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/payments/tbank/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
        }),
      });

      const result = (await response.json()) as ApiMessage;

      if (!response.ok || !result.paymentUrl) {
        throw new Error(result.error || "Не удалось создать платёж");
      }

      window.location.assign(result.paymentUrl);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ошибка создания платежа",
      );
      setBusy(false);
    }
  };

  const isPhoneVerified = data?.phoneVerified === true;
  const numericAmount = Number(amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Аналитика и баланс
          </h2>
          <p className="text-sm text-gray-400">
            Серверная история финансовых операций
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm text-[#FACC15]"
        >
          ← На дашборд
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
          <p className="text-sm text-gray-400">Доступный баланс</p>
          <p className="text-2xl font-bold text-green-400">
            {data?.balance === null
              ? "Без ограничений"
              : `${(data?.balance ?? 0).toFixed(2)} ₽`}
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
          <p className="text-sm text-gray-400">Потрачено</p>
          <p className="text-2xl font-bold text-white">
            {(data?.totalSpent ?? 0).toFixed(2)} ₽
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-5">
          <p className="text-sm text-gray-400">Лимит</p>
          <p className="text-2xl font-bold text-white">
            {(data?.monthlyLimit ?? 0).toFixed(2)} ₽
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
        <h3 className="text-lg font-semibold text-white">
          Пополнение баланса через Т-Банк
        </h3>

        <p className="text-sm text-gray-400">
          Перед оплатой необходимо подтвердить номер телефона
          одноразовым SMS-кодом.
        </p>

        <div className="flex flex-wrap gap-2">
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+7 900 000-00-00"
            disabled={isPhoneVerified || busy}
            className="rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white disabled:opacity-60"
          />

          {!isPhoneVerified && (
            <button
              disabled={busy || !phone.trim()}
              onClick={requestCode}
              className="rounded-lg bg-gray-700 px-4 py-2 text-white disabled:opacity-50"
            >
              Отправить код
            </button>
          )}
        </div>

        {!isPhoneVerified && (
          <div className="flex flex-wrap gap-2">
            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              maxLength={6}
              inputMode="numeric"
              placeholder="Код из SMS"
              className="rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white"
            />

            <button
              disabled={busy || code.length !== 6}
              onClick={verifyCode}
              className="rounded-lg bg-gray-700 px-4 py-2 text-white disabled:opacity-50"
            >
              Подтвердить номер
            </button>
          </div>
        )}

        {isPhoneVerified && (
          <p className="text-sm text-green-400">
            Номер {data?.phone || phone} подтверждён.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            min="100"
            max="100000"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-40 rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-white"
          />

          <button
            disabled={
              busy ||
              loading ||
              !Number.isFinite(numericAmount) ||
              numericAmount < 100 ||
              numericAmount > 100000 ||
              (data?.balance !== null && !isPhoneVerified)
            }
            onClick={createPayment}
            className="rounded-lg bg-[#FACC15] px-5 py-2 font-bold text-black disabled:opacity-50"
          >
            Перейти к оплате
          </button>
        </div>

        {message && (
          <p className="text-sm text-gray-300" role="status">
            {message}
          </p>
        )}

        {busy && (
          <p className="text-xs text-gray-500">
            Выполняется запрос…
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            История операций
          </h3>

          <button
            onClick={() => void load()}
            disabled={loading}
            className="text-sm text-[#FACC15] disabled:opacity-50"
          >
            {loading ? "Загрузка…" : "Обновить"}
          </button>
        </div>

        {!data?.transactions?.length ? (
          <p className="text-sm text-gray-500">
            {loading
              ? "Загрузка истории операций…"
              : "Финансовых операций пока нет."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2">Дата</th>
                  <th>Операция</th>
                  <th>Описание</th>
                  <th className="text-right">Сумма</th>
                </tr>
              </thead>

              <tbody>
                {data.transactions.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-gray-800 text-gray-200"
                  >
                    <td className="whitespace-nowrap py-3 pr-3">
                      {new Date(item.createdAt).toLocaleString("ru-RU")}
                    </td>

                    <td className="pr-3">{item.type}</td>

                    <td className="pr-3">{item.description}</td>

                    <td
                      className={`whitespace-nowrap text-right ${
                        item.amount < 0
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      {item.amount > 0 ? "+" : ""}
                      {item.amount.toFixed(2)} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
