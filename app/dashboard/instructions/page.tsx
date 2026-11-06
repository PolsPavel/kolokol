// app/dashboard/instructions/page.tsx
"use client";

import Link from "next/link";

const sectionClass =
  "scroll-mt-6 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6";

const linkClass = "text-[#FACC15] underline decoration-dotted hover:text-yellow-300";
const cardClass = "rounded-lg border border-gray-700 p-4 hover:border-[#FACC15] transition-colors block";

export default function InstructionsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 text-white pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#FACC15]">
            Справочный центр
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Инструкции по работе с KoloKol
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Полное руководство по запуску обзвонов, рассылок и управлению базой контактов.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#FACC15] hover:underline"
        >
          ← На дашборд
        </Link>
      </header>

      <nav className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
        <h2 className="text-lg font-bold">Содержание</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li><a className={linkClass} href="#basics">Быстрый старт</a></li>
          <li><a className={linkClass} href="#contacts">Работа с базой контактов</a></li>
          <li><a className={linkClass} href="#calls">Голосовые обзвоны (Кампании)</a></li>
          <li><a className={linkClass} href="#messengers">SMS и мессенджеры</a></li>
          <li><a className={linkClass} href="#email">Email-рассылки</a></li>
          <li><a className={linkClass} href="#billing">Биллинг и баланс</a></li>
        </ol>
      </nav>

      <section id="basics" className={sectionClass}>
        <h2 className="text-xl font-bold">1. Быстрый старт</h2>
        <p className="mt-3 leading-7 text-gray-300">
          Сервис работает по принципу единого окна. Для начала работы вам достаточно:
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-gray-300">
          <li>Пополнить баланс в разделе <Link href="/dashboard/analytics" className={linkClass}>«Аналитика и баланс»</Link>.</li>
          <li>Загрузить контакты в раздел <Link href="/dashboard/contacts" className={linkClass}>«Контакты»</Link>.</li>
          <li>Выбрать нужный канал коммуникации (Звонок, SMS или Email) и запустить кампанию.</li>
        </ol>
      </section>

      <section id="contacts" className={sectionClass}>
        <h2 className="text-xl font-bold">2. Работа с базой контактов</h2>
        <p className="mt-3 leading-7 text-gray-300">
          Все модули (обзвон, SMS, Email) используют единую базу контактов. Вы можете добавлять контакты вручную, импортировать из Excel или собирать через парсер.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard/contacts" className={cardClass}>
            <span className="font-semibold text-[#FACC15]">Ручное добавление и импорт</span>
            <span className="mt-1 block text-sm text-gray-400">
              Загружайте номера телефонов, email и Telegram ID списком.
            </span>
          </Link>
          <Link href="/dashboard/parser" className={cardClass}>
            <span className="font-semibold text-[#FACC15]">Парсер контактов</span>
            <span className="mt-1 block text-sm text-gray-400">
              Собирайте контакты с открытых сайтов и добавляйте их в базу в один клик.
            </span>
          </Link>
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-400">
          * Вся загружаемая база должна соответствовать требованиям 152-ФЗ. Вы несете ответственность за наличие согласий у ваших контрагентов.
        </p>
      </section>

      <section id="calls" className={sectionClass}>
        <h2 className="text-xl font-bold">3. Голосовые обзвоны (Кампании)</h2>
        <p className="mt-3 leading-7 text-gray-300">
          Модуль голосовых роботов позволяет автоматизировать холодные и теплые обзвоны с помощью ИИ.
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-gray-300">
          <li>
            <b>Создайте робота:</b> Перейдите в раздел <Link href="/dashboard/robots" className={linkClass}>«Роботы»</Link>. Введите текст сценария (он будет озвучен через Yandex SpeechKit) или загрузите свой аудиофайл.
          </li>
          <li>
            <b>Настройте телефонию:</b> В разделе <Link href="/dashboard/telephony" className={linkClass}>«Телефония»</Link> укажите номер, с которого будут исходить звонки (Caller ID).
          </li>
          <li>
            <b>Запустите кампанию:</b> В разделе <Link href="/dashboard/campaigns" className={linkClass}>«Кампании обзвона»</Link> создайте новую кампанию. Выберите робота, список контактов и расписание. Внимание: списание средств происходит поминутно во время звонка.
          </li>
          <li>
            <b>Анализируйте результаты:</b> После завершения кампании перейдите в <Link href="/dashboard/history" className={linkClass}>«Журнал звонков»</Link>, чтобы прослушать записи и увидеть статусы (Заинтересован, Отказ и т.д.).
          </li>
        </ol>
      </section>

      <section id="messengers" className={sectionClass}>
        <h2 className="text-xl font-bold">4. SMS и мессенджеры</h2>
        <p className="mt-3 leading-7 text-gray-300">
          Отправляйте сообщения через SMS-шлюз или Telegram-бота. Стоимость списывается за каждое успешно отправленное сообщение.
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-gray-300">
          <li>Перейдите в раздел <Link href="/dashboard/messengers" className={linkClass}>«Рассылки (SMS/WA/TG)»</Link>.</li>
          <li>Выберите канал связи (SMS или Telegram).</li>
          <li>Введите текст сообщения. Для SMS соблюдайте лимит в 70 символов (кириллица) или 160 (латиница), чтобы не разбивать сообщение на части.</li>
          <li>Выберите контакты из базы и нажмите «Отправить».</li>
        </ol>
      </section>

      <section id="email" className={sectionClass}>
        <h2 className="text-xl font-bold">5. Email-рассылки</h2>
        <p className="mt-3 leading-7 text-gray-300">
          Модуль Email-рассылок работает напрямую через ваш SMTP-сервер (или сервер KoloKol).
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-300">
          <li>Перейдите в <Link href="/dashboard/email" className={linkClass}>«Email-рассылки»</Link>.</li>
          <li>Укажите тему и тело письма.</li>
          <li>Выберите получателей из базы контактов (у которых заполнен email).</li>
          <li>Нажмите «Отправить». Система автоматически отфильтрует адреса из стоп-листа.</li>
          <li>Историю отправок и статистику по доставке можно посмотреть в разделе <Link href="/dashboard/reports" className={linkClass}>«Отчёты»</Link>.</li>
        </ul>
      </section>

      <section id="billing" className={sectionClass}>
        <h2 className="text-xl font-bold">6. Биллинг и баланс</h2>
        <p className="mt-3 leading-7 text-gray-300">
          Тарификация сервиса зависит от выбранного модуля:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-300">
          <li><b>Звонки:</b> списываются за каждую минуту разговора.</li>
          <li><b>SMS:</b> фиксированная стоимость за одно сообщение.</li>
          <li><b>Email:</b> списывается за каждое отправленное письмо.</li>
        </ul>
        <p className="mt-4 text-sm leading-6 text-gray-400">
          Пополнение баланса происходит через <Link href="/dashboard/analytics" className={linkClass}>Т-Банк</Link>. Для этого потребуется подтвердить ваш номер телефона по SMS. Все транзакции и чеки хранятся в разделе «Аналитика».
        </p>
      </section>
    </div>
  );
}