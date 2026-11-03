import { randomUUID } from "node:crypto";
import { normalizeE164Phone } from "@/lib/phone";

export async function sendMttSms(phone: string, message: string) {
  const endpoint = process.env.MTT_SMS_API_URL;
  const login = process.env.MTT_SMS_LOGIN;
  const password = process.env.MTT_SMS_PASSWORD;
  const sender = process.env.MTT_ALPHA_NAME;

  if (!endpoint || !login || !password || !sender) {
    throw new Error(
      "MTT_NOT_CONFIGURED: требуется MTT_SMS_API_URL, MTT_SMS_LOGIN, MTT_SMS_PASSWORD и MTT_ALPHA_NAME"
    );
  }

  const normalizedPhone = normalizeE164Phone(phone);

  if (!normalizedPhone) {
    throw new Error("MTT_INVALID_PHONE");
  }

  if (
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.length > 1000
  ) {
    throw new Error("MTT_INVALID_MESSAGE");
  }

  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("MTT_INVALID_ENDPOINT");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "MTT_SMS_API_URL должен использовать HTTPS без встроенных учётных данных"
    );
  }

  const messageId = randomUUID();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(
        `${login}:${password}`
      ).toString("base64")}`,
    },
    body: JSON.stringify({
      messages: [
        {
          content: {
            short_text: message.trim(),
          },
          from: {
            sms_address: sender,
          },
          to: [
            {
              msisdn: normalizedPhone.replace(/\D/g, ""),
              message_id: messageId,
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  const payload = await response.json().catch(() => null);

  if (
    !response.ok ||
    !payload ||
    payload.code ||
    !Array.isArray(payload.messages) ||
    payload.messages.length !== 1 ||
    !payload.messages[0]?.internal_id
  ) {
    console.error("MTT SMS request failed", {
      status: response.status,
      code: payload?.code,
    });

    throw new Error("MTT_SMS_SEND_FAILED");
  }

  return {
    messageId,
    providerMessageId: payload.messages[0].internal_id as string,
  };
}