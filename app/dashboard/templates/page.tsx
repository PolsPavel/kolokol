"use client";

import { useState } from "react";

const templates = [
  {
    id: "appointment",
    title: "Подтверждение записи",
    channel: "Звонок",
    goal: "Подтверждение / напоминание",
    text: "Здравствуйте! Напоминаем о вашей записи. Если вы планируете прийти, нажмите 1. Если нужно перенести запись, нажмите 2. Если запись больше не актуальна, нажмите 3. Спасибо.",
  },
  {
    id: "lead",
    title: "Обработка входящей заявки",
    channel: "Звонок",
    goal: "Квалификация лида",
    text: "Здравствуйте! Мы связываемся с вами по оставленной заявке. Если вам удобно обсудить её сейчас, нажмите 1. Если хотите, чтобы специалист перезвонил позже, нажмите 2. Если вопрос уже решён, нажмите 3.",
  },
  {
    id: "notification",
    title: "Информационное уведомление",
    channel: "Звонок",
    goal: "Уведомление",
    text: "Здравствуйте! Это информационное уведомление. Для соединения с сотрудником нажмите 1. Чтобы прослушать сообщение ещё раз, нажмите 2. Если вы не хотите получать подобные уведомления, нажмите 3.",
  },
  {
    id: "callback",
    title: "Обратный звонок",
    channel: "Звонок",
    goal: "Обратный звонок",
    text: "Здравствуйте! Мы получили ваш запрос на обратный звонок. Если готовы поговорить сейчас, нажмите 1. Если удобнее выбрать другое время, нажмите 2. Спасибо.",
  },
  {
    id: "email",
    title: "Письмо после заявки",
    channel: "Email",
    goal: "Обработка заявки",
    text: "Здравствуйте! Спасибо за обращение. Мы получили вашу заявку и передали её ответственному специалисту. Если потребуется уточнение, мы свяжемся с вами по указанным контактам. Если вы не хотите получать дальнейшие информационные сообщения, воспользуйтесь способом отказа, предусмотренным отправителем.",
  },
];

export default function TemplatesPage() {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = templates.filter((template) =>
    `${template.title} ${template.channel} ${template.goal}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const selectTemplate = async (template: (typeof templates)[number]) => {
    try {
      const selected = {
        ...template,
        selectedAt: new Date().toISOString(),
      };

      localStorage.setItem("voicepilot_selected_template", JSON.stringify(selected));

      let copied = false;

      try {
        await navigator.clipboard.writeText(template.text);
        copied = true;
      } catch {
        copied = false;
      }

      setNotice(
        `Шаблон «${template.title}» сохранён как выбранный шаблон. ${
          copied ? "Текст скопирован в буфер обмена." : "Не удалось скопировать текст автоматически."
        } Откройте раздел ${template.channel === "Email" ? "Email" : "Роботы"} и перенесите текст в сценарий. Автоматическая публикация не выполнялась.`
      );
    } catch {
      setNotice("Не удалось сохранить шаблон. Проверьте настройки браузера.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-white">
      <div>
        <p className="text-xs uppercase tracking-[.2em] text-[#FACC15]">Библиотека</p>
        <h2 className="mt-2 text-3xl font-bold">Готовые сценарии</h2>
        <p className="mt-1 text-sm text-gray-400">
          Стартовые тексты для допустимых уведомлений и обработки обращений.
          Перед использованием адаптируйте под цель и основание контакта.
        </p>
      </div>

      {notice && (
        <p className="rounded-xl border border-gray-700 bg-[#171717] p-3 text-sm">
          {notice}
        </p>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Найти сценарий"
        className="w-full rounded-xl border border-gray-700 bg-[#171717] px-4 py-3 sm:max-w-md"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((template) => (
          <article
            key={template.id}
            className="flex flex-col rounded-2xl border border-gray-800 bg-[#171717] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold">{template.title}</h3>
              <span className="rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300">
                {template.channel}
              </span>
            </div>

            <p className="mt-2 text-xs text-[#FACC15]">{template.goal}</p>

            <p className="mt-4 flex-1 whitespace-pre-wrap text-sm leading-6 text-gray-400">
              {template.text}
            </p>

            <button
              onClick={() => void selectTemplate(template)}
              className="mt-5 rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-black"
            >
              Выбрать и скопировать
            </button>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-500">По вашему запросу шаблоны не найдены.</p>
      )}

      <p className="text-xs leading-5 text-gray-600">
        Шаблоны не запускают звонки и не отправляют сообщения.
        Автоматическое создание робота будет добавлено после унификации модели сценариев.
      </p>
    </div>
  );
}