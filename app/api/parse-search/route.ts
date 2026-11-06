// app/api/parse-search/route.ts
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { auth } from "@/auth";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => p < 0 || p > 255)) return true;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateIPv6(ip: string) {
  const v = ip.toLowerCase().split("%")[0];
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
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
    if (!addresses.length || addresses.some(({ address, family }) => (family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address)))) throw new Error("PRIVATE_HOST");
  }
  url.hash = "";
  return url;
}

async function readLimited(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new Error("PAGE_TOO_LARGE"); }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { all.set(c, offset); offset += c.byteLength; }
  return new TextDecoder().decode(all);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { query?: string; limit?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 }); }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const limit = typeof body.limit === "number" ? Math.min(Math.max(body.limit, 1), 50) : 10;

  if (!query) return NextResponse.json({ error: "Введите поисковый запрос" }, { status: 400 });

  const FOLDER_ID = process.env.YANDEX_FOLDER_ID;
  const API_KEY = process.env.YANDEX_API_KEY;
  if (!FOLDER_ID || !API_KEY) return NextResponse.json({ error: "Поиск не настроен" }, { status: 503 });

  const yandexUrl = "https://searchapi.api.cloud.yandex.net/v2/web/search";
  const pagesNeeded = Math.ceil(limit / 10);
  let searchResults: string[] = [];

  for (let page = 0; page < pagesNeeded; page++) {
    if (searchResults.length >= limit) break;

    const requestBody = {
      query: { searchType: "SEARCH_TYPE_RU", queryText: query, familyMode: "FAMILY_MODE_MODERATE", page: page },
      folderId: FOLDER_ID,
      responseFormat: "FORMAT_XML",
      getOnlineSearchResults: true,
    };

    try {
      const response = await fetch(yandexUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Api-Key ${API_KEY}` },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) break;

      const data = await response.json();

      if (data.rawData) {
        let xml = Buffer.from(data.rawData, "base64").toString("utf-8");
        xml = xml.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

        const urlRegex = /https?:\/\/[^\s<>"']+/g;
        const foundUrls = xml.match(urlRegex) || [];

        const excludedDomains = [
          "yandex.", "ya.ru", "yastatic.net", "yandexcloud.net", "w3.org",
          "yandexwebcache.net", "yandex.ru/maps", "yandex.ru/images", "yandex.ru/video",
          "yabs.yandex", "mc.yandex", "an.yandex", "awaps.yandex",
          "google.", "gstatic.com", "googleapis.com", "youtube.com", "youtu.be",
          "vk.com", "mail.ru", "ok.ru", "avito.ru", "2gis.ru", "zoon.ru",
          "wikipedia.org", "wikimedia.org", "facebook.com", "instagram.com",
          "twitter.com", "t.me", "telegram.org", "whatsapp.com",
        ];

        const cleanedUrls = foundUrls.filter((u) => {
          try {
            const urlObj = new URL(u);
            const host = urlObj.hostname.toLowerCase();
            if (excludedDomains.some((ex) => host.includes(ex))) return false;
            if (/\.(png|jpg|jpeg|gif|css|js|svg|ico|pdf|zip|rar)$/i.test(urlObj.pathname)) return false;
            if (urlObj.pathname === "/" && host.split(".").length < 3) return false;
            return true;
          } catch { return false; }
        });

        searchResults = Array.from(new Set([...searchResults, ...cleanedUrls]));
      }
    } catch (e: any) {
      break;
    }
  }

  searchResults = searchResults.slice(0, limit);

  if (searchResults.length === 0) {
    return NextResponse.json({ results: [], message: "Ничего не найдено" });
  }

  const results: any[] = [];
  let processedCount = 0;

  for (const url of searchResults) {
    try {
      const safeUrl = await validatePublicUrl(url);
      const response = await fetch(safeUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(8000), // Уменьшили таймаут до 8 секунд
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      });
      if (!response.ok) continue;
      const html = await readLimited(response, 3 * 1024 * 1024);
      const $ = cheerio.load(html);
      $("script,style,noscript,svg").remove();

      const title = $("title").text().trim() || $("h1").first().text().trim() || "Без названия";
      const text = $("body").text();

      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const validEmails = Array.from(new Set(emails.map((e) => e.toLowerCase().trim()).filter((e) => e.length <= 254 && !e.match(/\.(png|jpg|css|js)$/))));

      const phones = text.match(/(\+?[0-9][0-9\s\-()]{8,18}[0-9])/g) || [];
      const validPhones = new Set<string>();
      for (const p of phones) {
        const cleaned = p.replace(/[^\d+]/g, "");
        const parsed = parsePhoneNumberFromString(cleaned, "RU");
        if (parsed?.isValid()) validPhones.add(parsed.number);
      }

      processedCount++;

      if (validEmails.length > 0 || validPhones.size > 0) {
        results.push({ url: safeUrl.href, title, emails: validEmails, phones: Array.from(validPhones) });
      }
    } catch (e) {
      // Не выводим ошибки таймаута в консоль, это нормально для недоступных сайтов
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  return NextResponse.json({ results, processed: processedCount });
}