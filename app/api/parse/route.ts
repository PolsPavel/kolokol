import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { auth } from "@/auth";

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateIPv6(ip: string) {
  const value = ip.toLowerCase().split("%")[0];
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
}

async function validatePublicUrl(raw: string) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !["", "80", "443"].includes(url.port)) throw new Error("INVALID_URL");

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("PRIVATE_HOST");

  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateIPv4(host)) throw new Error("PRIVATE_HOST");
  if (ipVersion === 6 && isPrivateIPv6(host)) throw new Error("PRIVATE_HOST");

  if (!ipVersion) {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address, family }) => family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address))) throw new Error("PRIVATE_HOST");
  }

  url.hash = "";
  return url;
}

async function readLimited(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("PAGE_TOO_LARGE");

  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("PAGE_TOO_LARGE");
    }

    chunks.push(value);
  }

  const all = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(all);
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: { url?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  if (typeof body.url !== "string" || body.url.length > 2048) {
    return NextResponse.json({ error: "Некорректный URL" }, { status: 400 });
  }

  let initial: URL;

  try {
    initial = await validatePublicUrl(body.url);
  } catch {
    return NextResponse.json(
      { error: "Разрешены только публичные HTTP/HTTPS-адреса" },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendData = (data: unknown) =>
        controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + "\n"));

      const visited = new Set<string>();
      const queue: string[] = [initial.href];
      const uniqueEmails = new Set<string>();
      const uniquePhones = new Set<string>();
      const maxPages = 50;

      try {
        while (queue.length && visited.size < maxPages && !req.signal.aborted) {
          const current = queue.shift()!;

          if (
            visited.has(current) ||
            /\.(pdf|jpg|jpeg|png|gif|zip|rar|doc|docx|xls|xlsx|css|js)(\?|$)/i.test(current)
          ) continue;

          visited.add(current);

          try {
            const safeUrl = await validatePublicUrl(current);

            const response = await fetch(safeUrl, {
              redirect: "manual",
              signal: AbortSignal.any([req.signal, AbortSignal.timeout(10000)]),
              headers: {
                "User-Agent": "KoloKolContactParser/1.0",
                Accept: "text/html,application/xhtml+xml",
              },
            });

            if (response.status >= 300 && response.status < 400) {
              const location = response.headers.get("location");

              if (location) {
                const redirectUrl = await validatePublicUrl(new URL(location, safeUrl).href);

                if (redirectUrl.origin === initial.origin && !visited.has(redirectUrl.href)) {
                  queue.push(redirectUrl.href);
                }
              }

              continue;
            }

            if (
              !response.ok ||
              !(response.headers.get("content-type") || "").includes("text/html")
            ) continue;

            const html = await readLimited(response, 2 * 1024 * 1024);
            const $ = cheerio.load(html);

            $("script,style,noscript,svg").remove();

            const text = $("body").text();

            const emails =
              text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

            for (const value of emails) {
              const email = value.toLowerCase().trim();

              if (email.length <= 254 && !uniqueEmails.has(email)) {
                uniqueEmails.add(email);
                sendData({ type: "email", value: email });
              }
            }

            const phones = text.match(/(\+?[0-9][0-9\s\-()]{8,18}[0-9])/g) || [];

            for (const value of phones) {
              const cleaned = value.replace(/[^\d+]/g, "");
              const parsed = parsePhoneNumberFromString(cleaned, "RU");

              if (parsed?.isValid() && !uniquePhones.has(parsed.number)) {
                uniquePhones.add(parsed.number);
                sendData({ type: "phone", value: parsed.number });
              }
            }

            $("a[href]").each((_, element) => {
              const href = $(element).attr("href");
              if (!href) return;

              try {
                const link = new URL(href, safeUrl);

                if (
                  link.origin === initial.origin &&
                  ["http:", "https:"].includes(link.protocol) &&
                  queue.length < maxPages * 2 &&
                  !visited.has(link.href)
                ) {
                  queue.push(link.href);
                }
              } catch {
                /* invalid link */
              }
            });

            sendData({
              type: "progress",
              pagesScanned: visited.size,
              queueSize: queue.length,
            });
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") break;
          }
        }

        sendData({
          type: "done",
          pagesScanned: visited.size,
          emails: uniqueEmails.size,
          phones: uniquePhones.size,
        });

        controller.close();
      } catch {
        sendData({ type: "error", message: "Ошибка парсинга" });
        controller.close();
      }
    },

    cancel() {
      /* request cancelled by client */
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}