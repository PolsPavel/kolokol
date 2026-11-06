// app/api/tts/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

const ALLOWED_VOICES = new Set([
  "alena", "filipp", "jane", "omazh", "zahar", "ermil", "marina",
  "dasha", "julia", "lera", "masha", "alexander", "kirill", "anton"
]);

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const apiKey = process.env.YANDEX_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Синтез речи не настроен" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const text = body?.text;
    const voice = body?.voice ?? "marina";

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Текст не передан" }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: "Максимальная длина текста — 5000 символов" }, { status: 400 });
    }

    if (typeof voice !== "string" || !ALLOWED_VOICES.has(voice)) {
      return NextResponse.json({ error: "Недопустимый голос" }, { status: 400 });
    }

    const response = await fetch(
      "https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis",
      {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
        body: JSON.stringify({
          text: text.trim(),
          outputAudioSpec: {
            containerAudio: {
              containerAudioType: "MP3",
            },
          },
          hints: [
            { voice: voice },
            { speed: 1.0 },
          ],
          loudnessNormalizationType: "LUFS",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ошибка Yandex SpeechKit v3:", response.status, errorText.slice(0, 500));
      return NextResponse.json({ error: "Провайдер синтеза речи отклонил запрос" }, { status: 502 });
    }

    const data = await response.json();

    // ИСПРАВЛЕНИЕ: данные лежат внутри поля "result"
    const audioBase64 = data?.result?.audioChunk?.data;

    if (!audioBase64) {
      console.error("Некорректный ответ от SpeechKit:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: "Провайдер вернул некорректный ответ" }, { status: 502 });
    }

    // Декодируем base64 в бинарный буфер
    const audioBuffer = Buffer.from(audioBase64, "base64");

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json({ error: "Провайдер вернул пустой аудиофайл" }, { status: 502 });
    }

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Ошибка API TTS:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}