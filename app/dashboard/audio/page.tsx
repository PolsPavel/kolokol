// app/dashboard/audio/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

type AudioRoll = {
  id: string;
  name: string;
  type: "tts" | "recorded";
  text?: string;
  voice?: string;
  audioDataUrl?: string;
  duration?: number; // длительность записи в секундах
  createdAt: string;
};

const AUDIO_ROLLS_KEY = "voicepilot_audio_rolls";
const ALLOWED_VOICES = new Set([
  "alena", "filipp", "jane", "omazh", "zahar", "ermil", "marina",
  "dasha", "julia", "lera", "masha", "alexander", "kirill", "anton"
]);

function loadAudioRolls(): AudioRoll[] {
  try { const raw = localStorage.getItem(AUDIO_ROLLS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveAudioRolls(rolls: AudioRoll[]) { localStorage.setItem(AUDIO_ROLLS_KEY, JSON.stringify(rolls)); }
function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export default function AudioPage() {
  const { toast } = useToast();
  const [audioRolls, setAudioRolls] = useState<AudioRoll[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [sourceType, setSourceType] = useState<"tts" | "recorded">("tts");
  const [audioName, setAudioName] = useState("");
  const [audioText, setAudioText] = useState("");
  const [audioVoice, setAudioVoice] = useState("marina");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0); // длительность записи
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAudioRolls(loadAudioRolls());
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const playText = async (textToSpeak: string, voiceToUse: string) => {
    if (!textToSpeak.trim()) return alert("Введите текст");
    setIsSpeaking(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, voice: voiceToUse }),
      });
      if (res.ok) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
        audio.play();
      } else { alert("Ошибка синтеза речи."); setIsSpeaking(false); }
    } catch (e) { console.error(e); setIsSpeaking(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        setRecordedDuration(durationSec);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudio(reader.result as string);
          setIsRecording(false);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Не удалось получить доступ к микрофону.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSaveAudio = () => {
    if (!audioName.trim()) return alert("Введите название ролика.");
    
    const now = new Date().toLocaleString("ru-RU");
    let newRoll: AudioRoll;

    if (sourceType === "tts") {
      if (!audioText.trim()) return alert("Введите текст для синтеза.");
      newRoll = {
        id: generateId(),
        name: audioName.trim(),
        type: "tts",
        text: audioText.trim(),
        voice: audioVoice,
        createdAt: now,
      };
      setAudioText("");
    } else {
      if (!recordedAudio) return alert("Сначала запишите аудио.");
      newRoll = {
        id: generateId(),
        name: audioName.trim(),
        type: "recorded",
        audioDataUrl: recordedAudio,
        duration: recordedDuration,
        createdAt: now,
      };
      setRecordedAudio(null);
      setRecordedDuration(0);
    }

    const updated = [...audioRolls, newRoll];
    setAudioRolls(updated);
    saveAudioRolls(updated);
    setAudioName("");
    alert("Аудиоролик создан и сохранён в библиотеку.");
  };

  const handleDeleteAudio = (id: string) => {
    if (!confirm("Удалить этот аудиоролик?")) return;
    const updated = audioRolls.filter(r => r.id !== id);
    setAudioRolls(updated);
    saveAudioRolls(updated);
  };

  const handleDownload = async (roll: AudioRoll) => {
    // Определяем длину для биллинга
    let effectiveLength = 0;
    if (roll.type === "tts" && roll.text) {
      effectiveLength = roll.text.length;
    } else if (roll.type === "recorded" && roll.duration) {
      // 1 секунда = 10 символов (условно)
      effectiveLength = roll.duration * 10;
    } else {
      toast("Не удалось определить длину ролика для списания.", "error");
      return;
    }

    setDownloadingId(roll.id);
    try {
      const checkRes = await fetch("/api/audio/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textLength: effectiveLength, type: roll.type }),
      });

      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        toast(checkData.error || "Ошибка скачивания", "error");
        return;
      }

      // Если это запись с микрофона — скачиваем напрямую (data URL)
      if (roll.type === "recorded" && roll.audioDataUrl) {
        const a = document.createElement("a");
        a.href = roll.audioDataUrl;
        a.download = `${roll.name}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        // Для синтеза речи — запрашиваем TTS и скачиваем MP3
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: roll.text, voice: roll.voice || "marina" }),
        });

        if (!ttsRes.ok) {
          toast("Ошибка синтеза речи", "error");
          return;
        }

        const blob = await ttsRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${roll.name}.mp3`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      toast(checkData.message || "Файл скачан", "success");
    } catch (e) {
      console.error(e);
      toast("Ошибка соединения", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!isLoaded) return <div className="p-8 text-center text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Аудиоролики</h2>
        <Link href="/dashboard" className="text-sm text-[#FACC15] hover:text-yellow-400 font-medium">← На дашборд</Link>
      </div>

      {/* Блок с условиями тарификации */}
      <div className="rounded-xl border border-blue-900/50 bg-blue-900/10 p-4 text-sm text-blue-200 space-y-2">
        <p className="font-semibold text-blue-300">Условия скачивания аудиороликов:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Прослушивание и создание роликов — бесплатно.</li>
          <li>Скачивание файла (MP3 или WebM) — <b>15 ₽ за каждые 1000 символов</b> (для записей с микрофона: 1 секунда = 10 символов).</li>
          <li>С нулевым балансом доступно не более <b>2 бесплатных роликов</b> длиной до 100 символов (только для синтеза речи).</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6 space-y-4 h-fit">
          <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Создать новый аудиоролик</h3>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Тип ролика</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSourceType("tts")} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${sourceType === "tts" ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]" : "border-gray-700 text-gray-400 hover:bg-gray-800"}`}>🤖 Синтез речи</button>
              <button type="button" onClick={() => setSourceType("recorded")} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${sourceType === "recorded" ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]" : "border-gray-700 text-gray-400 hover:bg-gray-800"}`}>🎙️ Свой голос</button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Название ролика</label>
            <input value={audioName} onChange={e => setAudioName(e.target.value)} placeholder="Например: Спасибо" className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white" />
          </div>

          {sourceType === "tts" && (
            <>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Голос</label>
                <select value={audioVoice} onChange={e => setAudioVoice(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white">
                  <optgroup label="Женские голоса"><option value="marina">Марина</option><option value="alena">Алёна</option><option value="jane">Джейн</option><option value="omazh">Омаж</option><option value="dasha">Даша (v3)</option><option value="julia">Юлия (v3)</option><option value="lera">Лера (v3)</option><option value="masha">Маша (v3)</option></optgroup>
                  <optgroup label="Мужские голоса"><option value="filipp">Филипп</option><option value="zahar">Захар</option><option value="ermil">Ермил</option><option value="alexander">Александр (v3)</option><option value="kirill">Кирилл (v3)</option><option value="anton">Антон (v3)</option></optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Текст</label>
                <textarea value={audioText} onChange={e => setAudioText(e.target.value)} rows={3} placeholder="Например: Извините, мы вас больше не побеспокоим." className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                <p className="text-xs text-gray-500 mt-1">Длина: {audioText.length} символов</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => playText(audioText, audioVoice)} disabled={isSpeaking || !audioText.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">▶ Прослушать</button>
              </div>
            </>
          )}

          {sourceType === "recorded" && (
            <div className="bg-black/20 border border-gray-800 rounded-lg p-4 space-y-4">
              <p className="text-sm text-gray-400">Запишите свой голос с микрофона.</p>
              <div className="flex flex-wrap gap-3 items-center">
                {!isRecording ? (
                  <button type="button" onClick={startRecording} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">🔴 Начать запись</button>
                ) : (
                  <button type="button" onClick={stopRecording} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 animate-pulse">⏹ Остановить запись</button>
                )}
                {recordedAudio && (<button type="button" onClick={() => { setRecordedAudio(null); setRecordedDuration(0); }} className="text-red-400 hover:text-red-300 text-sm underline">Удалить запись</button>)}
              </div>
              {recordedAudio && (
                <div className="bg-black/30 p-3 rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-400 mb-2">Запись готова (длительность: {recordedDuration} сек.):</p>
                  <audio controls src={recordedAudio} className="w-full h-10" />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={handleSaveAudio} disabled={!audioName.trim() || (sourceType === "tts" && !audioText.trim()) || (sourceType === "recorded" && !recordedAudio)} className="bg-[#FACC15] hover:bg-yellow-400 text-black px-6 py-2 rounded-lg font-bold disabled:opacity-50">+ Сохранить в библиотеку</button>
          </div>
        </div>

        <div className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2 mb-4">Библиотека роликов</h3>
          {audioRolls.length === 0 ? <p className="text-gray-500 text-sm">Пока нет созданных роликов.</p> : (
            <div className="space-y-3">
              {audioRolls.map(roll => (
                <div key={roll.id} className="bg-black/30 border border-gray-800 p-4 rounded-lg flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{roll.name}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {roll.type === "tts" 
                        ? `Синтез: «${roll.text}»` 
                        : `Запись с микрофона${roll.duration ? ` (${roll.duration} сек.)` : ""}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Создан: {roll.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => handleDownload(roll)}
                      disabled={downloadingId === roll.id}
                      className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                      title="Скачать файл"
                    >
                      {downloadingId === roll.id ? "..." : "📥"}
                    </button>
                    <button onClick={() => handleDeleteAudio(roll.id)} className="text-red-400 hover:text-red-300">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}