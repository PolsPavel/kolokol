import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-serif">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/" className="text-[#FACC15] hover:underline">← На главную</Link>
        <h1 className="text-3xl font-bold text-[#FACC15]">Политика конфиденциальности</h1>
        <p className="text-sm text-gray-400">Редакция от 1 октября 2026 г.</p>
        <div className="prose prose-invert max-w-none space-y-4 text-gray-300">
          <p>Настоящая Политика описывает, как ООО «KoloKol» собирает и обрабатывает данные пользователей платформы.</p>
          <h2 className="text-xl font-semibold text-white mt-6">Какие данные мы собираем</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Имя, email, название компании (при регистрации).</li>
            <li>Технические данные (IP-адрес, User-Agent) при акцепте оферты и работе с Сервисом.</li>
            <li>Данные о транзакциях и использовании Сервиса.</li>
          </ul>
          <h2 className="text-xl font-semibold text-white mt-6">Как мы используем данные</h2>
          <p>Для оказания услуг, связи с пользователем, улучшения Сервиса и соблюдения требований закона.</p>
          <h2 className="text-xl font-semibold text-white mt-6">Ответственность за данные клиентов</h2>
          <p className="bg-yellow-900/20 border border-yellow-800 p-4 rounded-lg">
            <b>Важно:</b> Заказчик самостоятельно несет ответственность за законность сбора и обработки 
            персональных данных своих контрагентов, загруженных в Сервис. Платформа выступает лишь 
            техническим инструментом обработки и не получает прав на эти данные.
          </p>
        </div>
      </div>
    </div>
  );
}