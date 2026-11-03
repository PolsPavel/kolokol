"use client";

import Link from "next/link";

const sectionClass =
  "scroll-mt-6 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6";

const linkClass = "text-[#FACC15] underline decoration-dotted hover:text-yellow-300";

export default function InstructionsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#FACC15]">
            Справочный центр
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Инструкции по работе с Kolokol
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Работа без подключённых внешних сервисов и подготовка к запуску.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#FACC15] hover:underline"
        >
          ← На дашборд
        </Link>
      </header>

      <section className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-5">
        <h2 className="text-lg font-bold text-amber-200">
          Текущий режим: демо
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-100/90">
          До получения договоров и реквизитов Voximplant, МТТ и Bitrix24
          интерфейс предназначен для настройки и тестирования внутренних
          сценариев. Локальные тестовые записи не являются подтверждением
          реального звонка, SMS, доставки сообщения или создания лида в CRM.
        </p>
      </section>

      <nav className="rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
        <h2 className="text-lg font-bold">Содержание</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>
            <a className={linkClass} href="#demo">
              Что можно проверять сейчас
            </a>
          </li>
          <li>
            <a className={linkClass} href="#bitrix">
              Подготовка Bitrix24
            </a>
          </li>
          <li>
            <a className={linkClass} href="#voximplant">
              Подготовка Voximplant
            </a>
          </li>
          <li>
            <a className={linkClass} href="#mtt">
              Подготовка МТТ
            </a>
          </li>
          <li>
            <a className={linkClass} href="#secrets">
              Правила хранения секретов
            </a>
          </li>
          <li>
            <a className={linkClass} href="#launch">
              Проверки перед реальным запуском
            </a>
          </li>
        </ol>
      </nav>

      <section id="demo" className={sectionClass}>
        <h2 className="text-xl font-bold">1. Что можно проверять сейчас</h2>
        <p className="mt-3 leading-7 text-gray-300">
          Для локального тестирования используй тестовые контакты и профили.
          В деморежиме можно проверять структуру кампаний, работу форм,
          выбор контактов, отображение истории и подготовку сообщений.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/contacts"
            className="rounded-lg border border-gray-700 p-4 hover:border-[#FACC15]"
          >
            <span className="font-semibold">Контакты</span>
            <span className="mt-1 block text-sm text-gray-400">
              Подготовь тестовую базу контактов.
            </span>
          </Link>

          <Link
            href="/dashboard/campaigns"
            className="rounded-lg border border-gray-700 p-4 hover:border-[#FACC15]"
          >
            <span className="font-semibold">Кампании</span>
            <span className="mt-1 block text-sm text-gray-400">
              Проверяй сценарии на тестовых данных.
            </span>
          </Link>

          <Link
            href="/dashboard/messengers"
            className="rounded-lg border border-gray-700 p-4 hover:border-[#FACC15]"
          >
            <span className="font-semibold">Сообщения</span>
            <span className="mt-1 block text-sm text-gray-400">
              Создавай тестовую историю без отправки.
            </span>
          </Link>

          <Link
            href="/dashboard/telephony"
            className="rounded-lg border border-gray-700 p-4 hover:border-[#FACC15]"
          >
            <span className="font-semibold">Телефония</span>
            <span className="mt-1 block text-sm text-gray-400">
              Настраивай локальные тестовые номера.
            </span>
          </Link>

          <Link
            href="/dashboard/integrations"
            className="rounded-lg border border-gray-700 p-4 hover:border-[#FACC15]"
          >
            <span className="font-semibold">CRM-интеграции</span>
            <span className="mt-1 block text-sm text-gray-400">
              Создавай локальный профиль Bitrix24.
            </span>
          </Link>

          <Link
            href="/dashboard/robots"
            className="rounded-lg border border-gray-700 p-4 hover:border-[#FACC15]"
          >
            <span className="font-semibold">Роботы</span>
            <span className="mt-1 block text-sm text-gray-400">
              Подготавливай текст и сценарии робота.
            </span>
          </Link>
        </div>
      </section>

      <section id="bitrix" className={sectionClass}>
        <h2 className="text-xl font-bold">2. Подготовка Bitrix24</h2>
        <p className="mt-3 leading-7 text-gray-300">
          Пока не нужно создавать реальные ключи. Когда будешь готов к
          подключению, начни с тестового портала Bitrix24 или с портала
          компании, на котором разрешено проверять интеграцию.
        </p>

        <ol className="mt-4 list-decimal space-y-3 pl-5 text-gray-300">
          <li>
            Войди в Bitrix24 с пользователем, которому разрешено управлять
            интеграциями.
          </li>
          <li>
            Открой раздел для разработчиков и найди создание входящего webhook.
            Название и расположение меню могут отличаться в зависимости от
            версии портала и тарифа.
          </li>
          <li>
            Выдай только необходимые права. Для работы с лидами потребуется
            доступ к CRM; дополнительные права добавляй только при
            необходимости.
          </li>
          <li>
            Сохрани webhook и проверь доступ безопасным запросом к методу{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5">profile</code>.
            Этот запрос возвращает профиль пользователя и не создаёт CRM-записи.
          </li>
          <li>
            После успешной проверки отдельно согласуем, какие данные Kolokol
            должен передавать в Bitrix24: лид, контакт, сделку или комбинацию
            объектов.
          </li>
        </ol>

        <div className="mt-5 rounded-lg border border-gray-700 bg-black/20 p-4">
          <p className="font-semibold">Официальная документация</p>
          <p className="mt-2 text-sm leading-6 text-gray-300">
            <a
              className={linkClass}
              href="https://apidocs.bitrix24.com/first-steps/first-rest-api-call.html"
              target="_blank"
              rel="noreferrer"
            >
              Как создать входящий webhook и проверить первый REST-запрос
            </a>
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-300">
            <a
              className={linkClass}
              href="https://apidocs.bitrix24.com/local-integrations/local-webhooks.html"
              target="_blank"
              rel="noreferrer"
            >
              Входящие и исходящие webhook: ограничения и безопасность
            </a>
          </p>
        </div>

        <p className="mt-4 text-sm leading-6 text-amber-200">
          Важно: не вставляй полный webhook URL в чат, исходный код,
          браузерное хранилище или публичные документы. Для будущего подключения
          потребуется безопасная серверная настройка секретов.
        </p>
      </section>

      <section id="voximplant" className={sectionClass}>
        <h2 className="text-xl font-bold">3. Подготовка Voximplant</h2>
        <p className="mt-3 leading-7 text-gray-300">
          До получения доступа можно проектировать кампании, список контактов,
          сценарии и отчёты. Для реальных вызовов позже потребуются рабочий
          аккаунт Voximplant, приложение и сценарии телефонии, а также
          согласованные параметры SIP или телефонного направления.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-gray-300">
          <li>Определи, какие вызовы нужны: входящие, исходящие или оба типа.</li>
          <li>Уточни, какие номера и SIP-учётные данные предоставляет провайдер.</li>
          <li>Согласуй правила повторных попыток, временные окна и стоп-лист.</li>
          <li>
            После получения доступа проведём отдельную проверку на тестовых
            номерах и только затем включим реальные вызовы.
          </li>
        </ol>

        <p className="mt-4 text-sm leading-6 text-gray-300">
          <a
            className={linkClass}
            href="https://voximplant.com/docs/"
            target="_blank"
            rel="noreferrer"
          >
            Официальная документация Voximplant
          </a>
        </p>
      </section>

      <section id="mtt" className={sectionClass}>
        <h2 className="text-xl font-bold">4. Подготовка МТТ</h2>
        <p className="mt-3 leading-7 text-gray-300">
          До заключения договора сообщения через МТТ не отправляются. На этапе
          подготовки можно проверить шаблоны, корректность номеров, список
          получателей и обработку тестовых статусов.
        </p>
        <p className="mt-3 leading-7 text-gray-300">
          После получения реквизитов понадобятся актуальная документация
          выбранного SMS API, адрес API, способ авторизации, имя отправителя
          и подтверждённые правила тарификации. Эти значения нельзя угадывать:
          их сверим с данными, выданными МТТ.
        </p>
      </section>

      <section id="secrets" className={sectionClass}>
        <h2 className="text-xl font-bold">5. Правила хранения секретов</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-6 text-gray-300">
          <li>Не сохраняй API-ключи и пароли провайдеров в localStorage.</li>
          <li>Не коммить файл .env в Git и не включай его в ZIP-архив проекта.</li>
          <li>Не присылай в чат пароли, приватные ключи и полные webhook URL.</li>
          <li>
            Используй отдельные тестовые ключи с минимальными правами, когда
            провайдер их поддерживает.
          </li>
          <li>
            Не считай сообщение «успешно отправлено» подтверждением доставки,
            пока статус не получен от провайдера и не проверен.
          </li>
        </ul>
      </section>

      <section id="launch" className={sectionClass}>
        <h2 className="text-xl font-bold">6. Проверки перед реальным запуском</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-6 text-gray-300">
          <li>Проверить TypeScript и ESLint без отключения правил.</li>
          <li>Выполнить production-сборку.</li>
          <li>Проверить вход, права пользователя и работу с базой данных.</li>
          <li>Проверить кампанию на тестовых контактах.</li>
          <li>Убедиться, что тестовый режим не вызывает платные API.</li>
          <li>
            Проверить CRM на тестовом портале и сверить созданные записи.
          </li>
          <li>
            Отдельно проверить SMS и звонки на тестовых номерах перед
            включением массовых операций.
          </li>
        </ul>

        <p className="mt-4 rounded-lg border border-gray-700 bg-black/20 p-4 text-sm leading-6 text-gray-400">
          Сборка Next.js подтверждалась ранее в твоём окружении. Это не
          заменяет проверку новых изменений и интеграционные испытания.
        </p>
      </section>
    </div>
  );
}