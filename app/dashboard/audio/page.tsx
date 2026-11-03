// app/dashboard/audio/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type AudioRoll = {
  id: string;
  name: string;
  type: "tts" | "recorded"; // Тип: синтез или запись
  text?: string;            // Если tts
  voice?: string;           // Если tts
  audioDataUrl?: string;    // Если recorded (Base64)
  createdAt: string;
};

const AUDIO_ROLLS_KEY = "voicepilot_audio_rolls";

function loadAudioRolls(): AudioRoll[] {
  try { const raw = localStorage.getItem(AUDIO_ROLLS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveAudioRolls(rolls: AudioRoll[]) { localStorage.setItem(AUDIO_ROLLS_KEY, JSON.stringify(rolls)); }
function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export default function AudioPage() {
  const [audioRolls, setAudioRolls] = useState<AudioRoll[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Стейты для создания ролика (текст)
  const [sourceType, setSourceType] = useState<"tts" | "recorded">("tts");
  const [audioName, setAudioName] = useState("");
  const [audioText, setAudioText] = useState("");
  const [audioVoice, setAudioVoice] = useState("marina");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Стейты для записи
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        body: JSON.stringify({ text: textToSpeak, voice: voiceToUse, emotion: "friendly" }),
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

  // Запись с микрофона
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
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
      setAudioText(""); // Очищаем текст
    } else {
      if (!recordedAudio) return alert("Сначала запишите аудио.");
      newRoll = {
        id: generateId(),
        name: audioName.trim(),
        type: "recorded",
        audioDataUrl: recordedAudio,
        createdAt: now,
      };
      setRecordedAudio(null); // Очищаем запись
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

  if (!isLoaded) return <div className="p-8 text-center text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Аудиоролики</h2>
        <Link href="/dashboard" className="text-sm text-[#FACC15] hover:text-yellow-400 font-medium">← На дашборд</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Блок создания */}
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
                  <option value="marina">Марина</option>
                  <option value="alena">Алена</option>
                  <option value="filipp">Филипп</option>
                  <option value="ermil">Ермил</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Текст</label>
                <textarea value={audioText} onChange={e => setAudioText(e.target.value)} rows={3} placeholder="Например: Извините, мы вас больше не побеспокоим." className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-white" />
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
                {recordedAudio && (<button type="button" onClick={() => setRecordedAudio(null)} className="text-red-400 hover:text-red-300 text-sm underline">Удалить запись</button>)}
              </div>
              {recordedAudio && (<div className="bg-black/30 p-3 rounded-lg border border-gray-800"><p className="text-xs text-gray-400 mb-2">Запись готова:</p><audio controls src={recordedAudio} className="w-full h-10" /></div>)}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={handleSaveAudio} disabled={!audioName.trim() || (sourceType === "tts" && !audioText.trim()) || (sourceType === "recorded" && !recordedAudio)} className="bg-[#FACC15] hover:bg-yellow-400 text-black px-6 py-2 rounded-lg font-bold disabled:opacity-50">+ Сохранить в библиотеку</button>
          </div>
        </div>

        {/* Блок библиотеки */}
        <div className="bg-[#1f1f1f] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2 mb-4">Библиотека роликов</h3>
          {audioRolls.length === 0 ? <p className="text-gray-500 text-sm">Пока нет созданных роликов.</p> : (
            <div className="space-y-3">
              {audioRolls.map(roll => (
                <div key={roll.id} className="bg-black/30 border border-gray-800 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <p className="font-medium text-white">{roll.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{roll.type === "tts" ? `Синтез: «${roll.text}»` : "Запись с микрофона"}</p>
                    <p className="text-xs text-gray-500 mt-1">Создан: {roll.createdAt}</p>
                  </div>
                  <button onClick={() => handleDeleteAudio(roll.id)} className="text-red-400 hover:text-red-300">🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}