// app/page.tsx
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-serif flex flex-col">
      {/* Хедер */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-[#FACC15]">
            <div className="w-10 h-10 bg-[#FACC15] rounded-xl flex items-center justify-center text-black text-xl shadow-[0_0_15px_rgba(250,204,21,0.4)]">🔔</div>
            KoloKol
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-[#FACC15] transition">Возможности</a>
            <a href="#how-it-works" className="hover:text-[#FACC15] transition">Как это работает</a>
            <a href="#pricing" className="hover:text-[#FACC15] transition">Тарифы</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition">
              Вход
            </Link>
            <Link href="/login" className="bg-[#FACC15] hover:bg-yellow-400 text-black px-5 py-2.5 rounded-lg text-sm font-bold transition shadow-lg shadow-yellow-500/20">
              Попробовать
            </Link>
          </div>
        </div>
      </header>

      {/* Hero-секция */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-[#FACC15]/10 border border-[#FACC15]/30 text-[#FACC15] text-sm font-semibold">
            🚀 Платформа нового поколения для B2B
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Голосовые роботы и <br className="hidden md:block"/> массовые рассылки <br className="hidden md:block"/> для вашего бизнеса
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            Автоматизируйте холодные звонки, SMS и email-рассылки. KoloKol обзвонит вашу базу, запишет разговоры, пришлет отчет в Excel и интегрируется с вашей CRM.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="bg-[#FACC15] hover:bg-yellow-400 text-black px-8 py-4 rounded-xl text-lg font-bold transition shadow-lg shadow-yellow-500/30">
              Начать работу
            </Link>
            <Link href="#features" className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-xl text-lg font-bold transition border border-gray-700">
              Узнать больше
            </Link>
          </div>
        </div>
      </section>

      {/* Возможности */}
      <section id="features" className="py-24 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Всё для автоматизации продаж</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Один сервис для обзвона, рассылок и аналитики. Больше не нужно покупать десятки инструментов.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Карточка 1 */}
            <div className="bg-[#1f1f1f] p-8 rounded-2xl border border-gray-800 hover:border-[#FACC15]/50 transition group">
              <div className="w-14 h-14 bg-[#FACC15]/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">🤖</div>
              <h3 className="text-xl font-bold mb-3">Голосовые роботы</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Робот ведет диалог, отвечает на вопросы, переводит на оператора. Качественные голоса Yandex SpeechKit, которые не отличить от живых.
              </p>
            </div>
            {/* Карточка 2 */}
            <div className="bg-[#1f1f1f] p-8 rounded-2xl border border-gray-800 hover:border-[#FACC15]/50 transition group">
              <div className="w-14 h-14 bg-[#FACC15]/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">📨</div>
              <h3 className="text-xl font-bold mb-3">Массовые рассылки</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Отправляйте SMS, сообщения в Telegram и WhatsApp, а также email-письма. Гибкая настройка сценариев и задержек.
              </p>
            </div>
            {/* Карточка 3 */}
            <div className="bg-[#1f1f1f] p-8 rounded-2xl border border-gray-800 hover:border-[#FACC15]/50 transition group">
              <div className="w-14 h-14 bg-[#FACC15]/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">📊</div>
              <h3 className="text-xl font-bold mb-3">Отчеты и аналитика</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Получайте детальные отчеты в Excel. Слушайте записи разговоров, отслеживайте конверсию и интегрируйтесь с CRM.
              </p>
            </div>
            {/* Карточка 4 */}
            <div className="bg-[#1f1f1f] p-8 rounded-2xl border border-gray-800 hover:border-[#FACC15]/50 transition group">
              <div className="w-14 h-14 bg-[#FACC15]/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">🕸️</div>
              <h3 className="text-xl font-bold mb-3">Парсинг контактов</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Собирайте email и телефоны с сайтов конкурентов или каталогов. Наполняйте базу контактов за пару кликов.
              </p>
            </div>
            {/* Карточка 5 */}
            <div className="bg-[#1f1f1f] p-8 rounded-2xl border border-gray-800 hover:border-[#FACC15]/50 transition group">
              <div className="w-14 h-14 bg-[#FACC15]/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">🔗</div>
              <h3 className="text-xl font-bold mb-3">Интеграции</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Подключайте Bitrix24, amoCRM или собственные вебхуки. Лиды автоматически попадают в вашу систему.
              </p>
            </div>
            {/* Карточка 6 */}
            <div className="bg-[#1f1f1f] p-8 rounded-2xl border border-gray-800 hover:border-[#FACC15]/50 transition group">
              <div className="w-14 h-14 bg-[#FACC15]/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition">🔒</div>
              <h3 className="text-xl font-bold mb-3">Безопасность</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Все данные защищены. Соответствие 152-ФЗ. Гибкое управление доступом сотрудников и ролями.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Как это работает */}
      <section id="how-it-works" className="py-24 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Как это работает</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Три простых шага до первого обзвона</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Линия */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gray-800 z-0"></div>

            {/* Шаг 1 */}
            <div className="relative z-10 text-center">
              <div className="w-24 h-24 mx-auto bg-[#1f1f1f] border-4 border-[#FACC15] rounded-full flex items-center justify-center text-3xl font-bold mb-6 shadow-[0_0_20px_rgba(250,204,21,0.3)]">1</div>
              <h3 className="text-xl font-bold mb-2">Загрузите контакты</h3>
              <p className="text-gray-400 text-sm">Импортируйте базу из Excel или соберите контакты через встроенный парсер.</p>
            </div>
            {/* Шаг 2 */}
            <div className="relative z-10 text-center">
              <div className="w-24 h-24 mx-auto bg-[#1f1f1f] border-4 border-[#FACC15] rounded-full flex items-center justify-center text-3xl font-bold mb-6 shadow-[0_0_20px_rgba(250,204,21,0.3)]">2</div>
              <h3 className="text-xl font-bold mb-2">Создайте робота</h3>
              <p className="text-gray-400 text-sm">Настройте сценарий разговора, выберите голос и запустите кампанию.</p>
            </div>
            {/* Шаг 3 */}
            <div className="relative z-10 text-center">
              <div className="w-24 h-24 mx-auto bg-[#1f1f1f] border-4 border-[#FACC15] rounded-full flex items-center justify-center text-3xl font-bold mb-6 shadow-[0_0_20px_rgba(250,204,21,0.3)]">3</div>
              <h3 className="text-xl font-bold mb-2">Получите отчет</h3>
              <p className="text-gray-400 text-sm">Слушайте записи, анализируйте результаты и выгружайте данные в Excel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Призыв к действию */}
      <section className="py-24 bg-gradient-to-br from-[#1f1f1f] to-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Готовы автоматизировать продажи?</h2>
          <p className="text-gray-400 mb-10 text-lg">Начните пользоваться сервисом уже сегодня.</p>
          <Link href="/login" className="inline-block bg-[#FACC15] hover:bg-yellow-400 text-black px-10 py-4 rounded-xl text-xl font-bold transition shadow-lg shadow-yellow-500/30">
            Попробовать
          </Link>
        </div>
      </section>

      {/* Футер */}
      <footer className="bg-black py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-xl font-bold text-[#FACC15]">
            <div className="w-8 h-8 bg-[#FACC15] rounded-lg flex items-center justify-center text-black text-sm">🔔</div>
            KoloKol
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/legal/offer" className="hover:text-white transition">Публичная оферта</Link>
            <Link href="/legal/privacy" className="hover:text-white transition">Политика конфиденциальности</Link>
          </div>
          <p className="text-sm text-gray-600">© 2026 KoloKol. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}