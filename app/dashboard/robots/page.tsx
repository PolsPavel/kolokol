"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type KnowledgeBaseItem = {
  id: string;
  question: string;
  answer: string;
};

type AudioRoll = {
  id: string;
  name: string;
  type: "tts" | "recorded";
  text?: string;
  audioDataUrl?: string;
};

type Robot = {
  id: string;
  name: string;
  sourceType: "tts" | "library";
  voice?: string;
  textContent?: string;
  libraryRollId?: string;
  knowledgeBase?: KnowledgeBaseItem[];
  createdAt: string;
  savedAt: string;
};

const STORAGE_KEY = "voicepilot_robots";
const AUDIO_ROLLS_KEY = "voicepilot_audio_rolls";
const DEFAULT_NAME = "ЭЛАР — робот B2B";
const ALLOWED_VOICES = new Set(["marina", "alena", "filipp", "ermil"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKnowledgeBaseItem(value: unknown): value is KnowledgeBaseItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.question === "string" &&
    typeof value.answer === "string"
  );
}

function isAudioRoll(value: unknown): value is AudioRoll {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.type === "tts" || value.type === "recorded")
  );
}

function isRobot(value: unknown): value is Robot {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.sourceType === "tts" || value.sourceType === "library") &&
    typeof value.createdAt === "string" &&
    typeof value.savedAt === "string" &&
    (value.knowledgeBase === undefined ||
      (Array.isArray(value.knowledgeBase) && value.knowledgeBase.every(isKnowledgeBaseItem)))
  );
}

function loadRobots(): Robot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRobot) : [];
  } catch {
    return [];
  }
}

function saveRobots(robots: Robot[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(robots));
    return true;
  } catch (error) {
    console.error("Не удалось сохранить роботов:", error);
    return false;
  }
}

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function loadAudioRolls(): AudioRoll[] {
  try {
    const raw = localStorage.getItem(AUDIO_ROLLS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAudioRoll) : [];
  } catch {
    return [];
  }
}

export default function RobotsPage() {
  const router = useRouter();

  const [robotId, setRobotId] = useState<string | null>(null);
  const [name, setName] = useState(DEFAULT_NAME);
  const [sourceType, setSourceType] = useState<"tts" | "library">("tts");
  const [voice, setVoice] = useState("marina");
  const [textContent, setTextContent] = useState("");
  const [libraryRollId, setLibraryRollId] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [kbQuestion, setKbQuestion] = useState("");
  const [kbAnswer, setKbAnswer] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [availableRolls, setAvailableRolls] = useState<AudioRoll[]>([]);

  useEffect(() => {
    setAvailableRolls(loadAudioRolls());

    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
      const existing = loadRobots().find((robot) => robot.id === id);
      if (existing) {
        setRobotId(existing.id);
        setName(existing.name);
        setSourceType(existing.sourceType);
        setVoice(
          typeof existing.voice === "string" && ALLOWED_VOICES.has(existing.voice)
            ? existing.voice
            : "marina",
        );
        setTextContent(typeof existing.textContent === "string" ? existing.textContent : "");
        setLibraryRollId(
          typeof existing.libraryRollId === "string" ? existing.libraryRollId : "",
        );
        setKnowledgeBase(existing.knowledgeBase ?? []);
        setSavedAt(existing.savedAt);
        setCreatedAt(existing.createdAt);
      }
    }

    setIsLoaded(true);
  }, []);

  const playText = async (textToSpeak: string, voiceToUse: string) => {
    if (!textToSpeak.trim()) {
      alert("Введите текст");
      return;
    }
    if (isSpeaking) return;

    setIsSpeaking(true);
    let audioUrl: string | null = null;
    let audio: HTMLAudioElement | null = null;

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak.trim(),
          voice: ALLOWED_VOICES.has(voiceToUse) ? voiceToUse : "marina",
          emotion: "friendly",
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка синтеза речи (${response.status}).`);
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error("Сервис синтеза вернул пустой аудиофайл.");
      }

      audioUrl = URL.createObjectURL(audioBlob);
      audio = new Audio(audioUrl);

      await new Promise<void>((resolve, reject) => {
        const currentAudio = audio;
        if (!currentAudio) {
          reject(new Error("Не удалось создать аудиоплеер."));
          return;
        }

        const cleanup = () => {
          currentAudio.onended = null;
          currentAudio.onerror = null;
        };

        currentAudio.onended = () => {
          cleanup();
          resolve();
        };
        currentAudio.onerror = () => {
          cleanup();
          reject(new Error("Не удалось воспроизвести аудио."));
        };

        currentAudio.play().catch((error: unknown) => {
          cleanup();
          reject(error);
        });
      });
    } catch (error) {
      console.error("Ошибка воспроизведения речи:", error);
      alert(error instanceof Error ? error.message : "Не удалось воспроизвести речь.");
    } finally {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setIsSpeaking(false);
    }
  };

  const addKbItem = () => {
    const question = kbQuestion.trim();
    const answer = kbAnswer.trim();

    if (!question || !answer) {
      alert("Заполните вопрос и ответ");
      return;
    }

    setKnowledgeBase((current) => [...current, { id: generateId(), question, answer }]);
    setKbQuestion("");
    setKbAnswer("");
  };

  const removeKbItem = (id: string) => {
    setKnowledgeBase((current) => current.filter((item) => item.id !== id));
  };

  const handleSaveRobot = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("Введите название робота.");
      return;
    }
    if (sourceType === "tts" && !textContent.trim()) {
      alert("Введите текст для синтеза.");
      return;
    }
    if (
      sourceType === "library" &&
      !availableRolls.some((roll) => roll.id === libraryRollId)
    ) {
      alert("Выберите доступный аудиоролик из библиотеки.");
      return;
    }

    const now = new Date().toLocaleString("ru-RU");
    const existingRobots = loadRobots();
    const id = robotId || generateId();

    const robot: Robot = {
      id,
      name: trimmedName,
      sourceType,
      voice: sourceType === "tts" ? (ALLOWED_VOICES.has(voice) ? voice : "marina") : undefined,
      textContent: sourceType === "tts" ? textContent.trim() : undefined,
      libraryRollId: sourceType === "library" ? libraryRollId : undefined,
      knowledgeBase,
      createdAt: createdAt || now,
      savedAt: now,
    };

    const updated = [...existingRobots];
    const index = updated.findIndex((item) => item.id === id);
    if (index >= 0) updated[index] = robot;
    else updated.push(robot);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Не удалось сохранить робота:", error);
      alert("Не удалось сохранить робота. Проверьте доступное место в браузере и настройки хранения данных.");
      return;
    }

    setSavedAt(now);
    alert("Робот сохранён.");
    router.push("/dashboard/robots");
  };

  if (!isLoaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-white">
          {robotId ? "Редактирование робота" : "Создание робота"}
        </h2>
        <Link
          href="/dashboard/robots"
          className="text-sm font-medium text-[#FACC15] hover:text-yellow-400"
        >
          ← К списку роботов
        </Link>
      </div>

      <div className="space-y-6 rounded-xl border border-gray-800 bg-[#1f1f1f] p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="robot-name" className="mb-1 block text-sm font-medium text-gray-300">
              Название робота
            </label>
            <input
              id="robot-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-gray-700 bg-black/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
              placeholder="Например: ЭЛАР — робот B2B"
            />
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-gray-300">Источник голоса</span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={sourceType === "tts"}
                onClick={() => setSourceType("tts")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                  sourceType === "tts"
                    ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]"
                    : "border-gray-700 text-gray-400 hover:bg-gray-800"
                }`}
              >
                🤖 Синтез речи
              </button>
              <button
                type="button"
                aria-pressed={sourceType === "library"}
                onClick={() => setSourceType("library")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                  sourceType === "library"
                    ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]"
                    : "border-gray-700 text-gray-400 hover:bg-gray-800"
                }`}
              >
                📚 Из библиотеки
              </button>
            </div>
          </div>
        </div>

        {sourceType === "tts" && (
          <>
            <div>
              <label htmlFor="robot-voice" className="mb-1 block text-sm font-medium text-gray-300">
                Голос робота
              </label>
              <select
                id="robot-voice"
                value={voice}
                onChange={(event) => setVoice(event.target.value)}
                className="w-full max-w-xs rounded-lg border border-gray-700 bg-black/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
              >
                <option value="marina">Марина (Женский)</option>
                <option value="alena">Алёна (Женский)</option>
                <option value="filipp">Филипп (Мужской)</option>
                <option value="ermil">Ермил (Мужской)</option>
              </select>
            </div>

            <div>
              <label htmlFor="robot-text" className="mb-2 block text-sm font-medium text-gray-300">
                Текст для озвучки
              </label>
              <textarea
                id="robot-text"
                value={textContent}
                onChange={(event) => setTextContent(event.target.value)}
                rows={6}
                maxLength={50000}
                placeholder="Введите текст..."
                className="w-full resize-y rounded-lg border border-gray-700 bg-black/50 px-4 py-3 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void playText(textContent, voice)}
                  disabled={isSpeaking}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSpeaking ? "Синтез..." : "▶ Прослушать"}
                </button>
              </div>
            </div>
          </>
        )}

        {sourceType === "library" && (
          <div>
            <label htmlFor="library-roll" className="mb-1 block text-sm font-medium text-gray-300">
              Выберите аудиоролик
            </label>
            {availableRolls.length === 0 ? (
              <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-3 text-sm text-yellow-300">
                У вас пока нет созданных роликов. Перейдите в раздел{" "}
                <Link href="/dashboard/audio" className="underline hover:text-white">
                  «Аудиоролики»
                </Link>
                , чтобы создать их.
              </div>
            ) : (
              <select
                id="library-roll"
                value={libraryRollId}
                onChange={(event) => setLibraryRollId(event.target.value)}
                className="w-full max-w-md rounded-lg border border-gray-700 bg-black/50 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#FACC15]"
              >
                <option value="">— Выберите ролик —</option>
                {availableRolls.map((roll) => (
                  <option key={roll.id} value={roll.id}>
                    {roll.name} ({roll.type === "tts" ? "Синтез" : "Запись"})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="border-t border-gray-800 pt-6">
          <h3 className="mb-4 font-semibold text-white">База знаний (FAQ)</h3>

          {knowledgeBase.map((item) => (
            <div key={item.id} className="mb-3 rounded-lg border border-gray-800 bg-black/30 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="break-words text-sm font-medium text-[#FACC15]">? {item.question}</p>
                <button
                  type="button"
                  onClick={() => removeKbItem(item.id)}
                  aria-label={`Удалить вопрос: ${item.question}`}
                  className="shrink-0 text-red-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
              <p className="break-words text-sm text-gray-300">{item.answer}</p>
            </div>
          ))}

          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              aria-label="Вопрос базы знаний"
              value={kbQuestion}
              onChange={(event) => setKbQuestion(event.target.value)}
              maxLength={2000}
              placeholder="Вопрос"
              className="rounded-lg border border-gray-700 bg-black/50 px-3 py-1.5 text-sm text-white"
            />
            <textarea
              aria-label="Ответ базы знаний"
              value={kbAnswer}
              onChange={(event) => setKbAnswer(event.target.value)}
              rows={2}
              maxLength={10000}
              placeholder="Ответ"
              className="rounded-lg border border-gray-700 bg-black/50 px-3 py-1.5 text-sm text-white"
            />
          </div>

          <button
            type="button"
            onClick={addKbItem}
            className="rounded bg-[#FACC15] px-4 py-1.5 text-sm font-bold text-black hover:bg-yellow-400"
          >
            + Добавить в базу
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-800 pt-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard/robots")}
            className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-800"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSaveRobot}
            className="rounded-lg bg-green-600 px-6 py-2 font-bold text-white hover:bg-green-700"
          >
            Сохранить робота
          </button>
        </div>
      </div>
    </div>
  );
}