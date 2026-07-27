import "server-only";

import type { ExtractedProduct } from "@/lib/scraper/extract";
import { extractProduct } from "@/lib/scraper/extract";
import { cleanTitle } from "@/lib/scraper/junk";
import { parsePrice } from "@/lib/scraper/price";
import { fetchHtml } from "@/lib/scraper/safe-fetch";

/**
 * Gratis leesdiensten voor pagina's die wij zelf niet binnenkomen.
 *
 * bol.com en Amazon weigeren verzoeken vanaf datacenters, en daar draait deze
 * app op. Deze diensten halen de pagina wél op en geven ons de inhoud terug.
 * Allebei gratis en zonder sleutel; ze hebben wel een limiet per uur/dag, dus
 * we proberen ze pas als onze eigen poging niets bruikbaars oplevert, en we
 * stoppen zodra er één werkt.
 *
 * Uit te zetten met SCRAPER_READERS=off, mocht je liever niets naar derden
 * sturen. Het gaat om openbare productlinks, verder niets.
 */

export type ReaderOutcome = {
  product: Partial<ExtractedProduct>;
  source: string;
};

/** Per dienst, zodat één trage dienst het verzoek niet gijzelt. */
const READER_TIMEOUT_MS = 9_000;
/** Samen; daarna geven we op en vullen we aan met wat de link zelf zegt. */
const READER_BUDGET_MS = 18_000;

function readersEnabled() {
  return process.env.SCRAPER_READERS !== "off";
}

/**
 * Jina Reader (r.jina.ai) — haalt de pagina op, voert JavaScript uit en geeft
 * hem terug als leesbare tekst. Gratis zonder sleutel.
 */
async function readViaJina(url: string): Promise<ReaderOutcome | null> {
  const page = await fetchHtml(`https://r.jina.ai/${url}`, {
    allowText: true,
    timeoutMs: READER_TIMEOUT_MS,
    headers: {
      Accept: "text/plain, text/html;q=0.9, */*;q=0.8",
      "X-Return-Format": "markdown",
    },
  });
  if (!page.html) return null;

  const product = parseJinaMarkdown(page.html, url);
  return product.title ? { product, source: "jina" } : null;
}

/**
 * Microlink — geeft de metadata van een pagina terug als JSON. Gratis tot een
 * bescheiden aantal verzoeken per dag, zonder sleutel.
 */
async function readViaMicrolink(url: string): Promise<ReaderOutcome | null> {
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
  const page = await fetchHtml(endpoint, {
    allowText: true,
    timeoutMs: READER_TIMEOUT_MS,
    headers: { Accept: "application/json" },
  });
  if (!page.html) return null;

  const product = parseMicrolink(page.html, url);
  return product.title ? { product, source: "microlink" } : null;
}

/* --- Parsers, los van het netwerk zodat ze te testen zijn ---------------- */

/**
 * De uitvoer van Jina begint met kopregels ("Title:", "URL Source:") gevolgd
 * door de pagina als markdown.
 */
export function parseJinaMarkdown(
  text: string,
  pageUrl: string,
): Partial<ExtractedProduct> {
  const hostname = safeHostname(pageUrl);

  const title = cleanTitle(
    /^Title:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? null,
    hostname,
  );

  // Eerste markdown-afbeelding die niet op een logo of icoon lijkt.
  let imageUrl: string | null = null;
  const imagePattern = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = imagePattern.exec(text)) !== null) {
    const candidate = match[1];
    if (/logo|icon|sprite|pixel|avatar|badge|flag/i.test(candidate)) continue;
    imageUrl = candidate;
    break;
  }

  // Een bedrag met valutateken; het eerste is vrijwel altijd de prijs.
  const priceMatch = /(?:€|EUR|\$|£)\s?\d[\d.,]*/.exec(text);
  const parsed = priceMatch ? parsePrice(priceMatch[0]) : null;

  return {
    title,
    imageUrl,
    priceCents: parsed?.cents ?? null,
    currency: parsed?.currency ?? null,
  };
}

/** Het JSON-antwoord van Microlink. */
export function parseMicrolink(
  body: string,
  pageUrl: string,
): Partial<ExtractedProduct> {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return {};
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as { status?: string }).status !== "success"
  ) {
    return {};
  }

  const data = (payload as { data?: Record<string, unknown> }).data;
  if (!data) return {};

  const image = data.image as { url?: string } | string | undefined;
  const imageUrl =
    typeof image === "string" ? image : (image?.url ?? null);

  return {
    title: cleanTitle(
      typeof data.title === "string" ? data.title : null,
      safeHostname(pageUrl),
    ),
    description:
      typeof data.description === "string" ? data.description : null,
    imageUrl,
    priceCents: null,
    currency: null,
  };
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

/**
 * Probeert de leesdiensten op volgorde en stopt bij de eerste die een
 * bruikbare productnaam oplevert. Faalt er één, dan gaan we door met de
 * volgende; ze mogen de app nooit laten klappen.
 */
export async function readViaFallbacks(
  url: string,
): Promise<ReaderOutcome | null> {
  if (!readersEnabled()) return null;

  const deadline = Date.now() + READER_BUDGET_MS;

  for (const reader of [readViaJina, readViaMicrolink]) {
    if (Date.now() >= deadline) break;
    try {
      const outcome = await reader(url);
      if (outcome) return outcome;
    } catch {
      // Dienst plat, limiet bereikt of traag: gewoon de volgende proberen.
    }
  }
  return null;
}

/** Leest een pagina die we via een dienst binnenkregen als gewone HTML. */
export function extractFromHtml(html: string, pageUrl: string) {
  const product = extractProduct(html, pageUrl);
  return { ...product, title: cleanTitle(product.title, safeHostname(pageUrl)) };
}
