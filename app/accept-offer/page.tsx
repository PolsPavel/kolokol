// app/accept-offer/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function AcceptOfferPage() {
  const { update } = useSession(); // Используем стандартный клиентский update
  const [agreedOffer, setAgreedOffer] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const canProceed = agreedOffer && agreedPrivacy;

  const handleAccept = async () => {
    if (!canProceed) {
      setError('Необходимо подтвердить согласие с обоими документами.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/legal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedOffer: true,
          acceptedPrivacy: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // 1. Обновляем сессию на клиенте (перезаписываем куки)
        await update({
          offerVersion: data.offerVersion,
          privacyVersion: data.privacyVersion,
        });

        // 2. Даём браузеру 300мс на запись куки
        setTimeout(() => {
          // 3. Жесткий переход (полная перезагрузка)
          window.location.href = '/dashboard';
        }, 300);
      } else {
        setError(data.error || 'Ошибка при сохранении.');
      }
    } catch (e) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-serif">
      <div className="w-full max-w-lg bg-[#1f1f1f] rounded-2xl shadow-xl border border-gray-800 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#FACC15] rounded-xl mx-auto flex items-center justify-center text-black font-bold text-2xl">
            K
          </div>
          <h1 className="text-2xl font-bold text-white">Добро пожаловать в KoloKol</h1>
        </div>

        {error && (
          <div className="bg-red-900/30 text-red-400 text-sm p-3 rounded-lg border border-red-800">
            {error}
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-300">
          <label className="flex items-start gap-3 cursor-pointer p-3 bg-black/30 rounded-lg border border-gray-800 hover:border-[#FACC15]/50 transition">
            <input
              type="checkbox"
              checked={agreedOffer}
              onChange={(e) => setAgreedOffer(e.target.checked)}
              className="w-5 h-5 accent-[#FACC15] mt-0.5 shrink-0"
            />
            <span>
              Я принимаю условия{' '}
              <Link href="/legal/offer" target="_blank" className="text-[#FACC15] hover:underline font-medium">
                Публичной оферты
              </Link>
              .
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 bg-black/30 rounded-lg border border-gray-800 hover:border-[#FACC15]/50 transition">
            <input
              type="checkbox"
              checked={agreedPrivacy}
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
              className="w-5 h-5 accent-[#FACC15] mt-0.5 shrink-0"
            />
            <span>
              Я согласен с{' '}
              <Link href="/legal/privacy" target="_blank" className="text-[#FACC15] hover:underline font-medium">
                Политикой конфиденциальности
              </Link>
              .
            </span>
          </label>
        </div>

        <button
          onClick={handleAccept}
          disabled={isLoading || !canProceed}
          className="w-full bg-[#FACC15] hover:bg-yellow-400 text-black py-3 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Сохранение...' : 'Принять и продолжить'}
        </button>
      </div>
    </div>
  );
}