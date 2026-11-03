import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

const ALLOWED_VOICES = new Set([
  "alena",
  "filipp",
  "jane",
  "omazh",
  "zahar",
  "ermil",
  "marina",
]);

const ALLOWED_EMOTIONS = new Set([
  "good",
  "evil",
  "neutral",
]);

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 }
    );
  }

  const apiKey = process.env.YANDEX_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Синтез речи не настроен" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();

    const text = body?.text;
    const voice = body?.voice ?? "marina";
    const emotion = body?.emotion ?? "good";

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Текст не передан" },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Максимальная длина текста — 5000 символов" },
        { status: 400 }
      );
    }

    if (typeof voice !== "string" || !ALLOWED_VOICES.has(voice)) {
      return NextResponse.json(
        { error: "Недопустимый голос" },
        { status: 400 }
      );
    }

    if (
      typeof emotion !== "string" ||
      !ALLOWED_EMOTIONS.has(emotion)
    ) {
      return NextResponse.json(
        { error: "Недопустимая эмоциональная окраска" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize",
      {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
        body: new URLSearchParams({
          text: text.trim(),
          lang: "ru-RU",
          voice,
          emotion,
          format: "mp3",
          speed: "1.0",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Ошибка Yandex SpeechKit:",
        response.status,
        errorText.slice(0, 300)
      );

      return NextResponse.json(
        { error: "Провайдер синтеза речи отклонил запрос" },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "Провайдер вернул пустой аудиофайл" },
        { status: 502 }
      );
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

    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}