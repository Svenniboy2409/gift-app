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

/**
 * Ruim genomen: deze diensten halen een hele pagina op en voeren soms ook nog
 * JavaScript uit, en dat kost tijd. Omdat ze naast elkaar draaien wachten we
 * nooit langer dan dit in totaal.
 */
const READER_TIMEOUT_MS = 22_000;

function readersEnabled() {
  return process.env.SCRAPER_READERS !== "off";
}

/**
 * Jina Reader (r.jina.ai) — haalt de pagina op, voert JavaScript uit en geeft
 * hem terug als leesbare tekst. Gratis zonder sleutel.
 */
async function readViaJina(url: string): Promise<ReaderOutcome | null> {
  // We vragen om HTML: dan kunnen we onze eigen extractie erop loslaten en
  // krijgen we ook JSON-LD en OpenGraph mee — inclusief de prijs. Geeft de
  // dienst toch markdown terug, dan vangt parseReaderText dat op.
  const page = await fetchHtml(`https://r.jina.ai/${url}`, {
    allowText: true,
    timeoutMs: READER_TIMEOUT_MS,
    headers: {
      Accept: "text/html, text/plain;q=0.9, */*;q=0.8",
      "X-Return-Format": "html",
    },
  });
  if (!page.html) return null;

  const product = parseReaderText(page.html, url);
  return product.title ? { product, source: "jina" } : null;
}

/**
 * AllOrigins — haalt een pagina op en geeft hem onbewerkt terug. Gratis, geen
 * sleutel. Andere infrastructuur dan Jina, dus een winkel die de één weert
 * laat de ander vaak wel door.
 */
async function readViaAllOrigins(url: string): Promise<ReaderOutcome | null> {
  const endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const page = await fetchHtml(endpoint, {
    allowText: true,
    timeoutMs: READER_TIMEOUT_MS,
    headers: { Accept: "text/html, */*;q=0.8" },
  });
  if (!page.html) return null;

  const product = parseReaderText(page.html, url);
  return product.title ? { product, source: "allorigins" } : null;
}

/**
 * CodeTabs — nog een gratis doorgeefluik, op weer andere infrastructuur.
 * Geen sleutel nodig.
 */
async function readViaCodeTabs(url: string): Promise<ReaderOutcome | null> {
  const endpoint = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
  const page = await fetchHtml(endpoint, {
    allowText: true,
    timeoutMs: READER_TIMEOUT_MS,
    headers: { Accept: "text/html, */*;q=0.8" },
  });
  if (!page.html) return null;

  const product = parseReaderText(page.html, url);
  return product.title ? { product, source: "codetabs" } : null;
}

/**
 * Het Internet Archive. Een archiefkopie is per definitie ouder, dus de prijs
 * kan achterhaald zijn — maar naam en foto kloppen, en het archief weert
 * datacenters niet. Voor winkels die álle doorgeefluiken blokkeren is dit vaak
 * de enige die nog iets oplevert.
 */
async function readViaWayback(url: string): Promise<ReaderOutcome | null> {
  const lookup = await fetchHtml(
    `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
    {
      allowText: true,
      timeoutMs: READER_TIMEOUT_MS,
      headers: { Accept: "application/json" },
    },
  );
  if (!lookup.html) return null;

  const raw = waybackSnapshotUrl(lookup.html);
  if (!raw) return null;

  const page = await fetchHtml(raw, {
    allowText: true,
    timeoutMs: READER_TIMEOUT_MS,
  });
  if (!page.html) return null;

  const product = parseReaderText(page.html, url);
  return product.title ? { product, source: "wayback" } : null;
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
 * Het antwoord van de beschikbaarheidscheck van het archief → de URL van de
 * onbewerkte momentopname, of null als er geen kopie is.
 */
export function waybackSnapshotUrl(body: string): string | null {
  let payload: {
    archived_snapshots?: { closest?: { available?: boolean; url?: string } };
  };
  try {
    payload = JSON.parse(body);
  } catch {
    return null;
  }

  const closest = payload.archived_snapshots?.closest;
  if (!closest?.available || !closest.url) return null;

  // Met "id_" achter het tijdstempel krijgen we de pagina zoals hij was, zonder
  // de navigatiebalk die het archief er normaal omheen zet.
  return closest.url
    .replace(/^http:/, "https:")
    .replace(/\/web\/(\d+)\//, "/web/$1id_/");
}

/**
 * Een leesdienst geeft ons HTML of platte tekst terug. HTML kunnen we door de
 * gewone extractie halen; bij tekst vallen we terug op de markdown-vorm.
 */
export function parseReaderText(
  body: string,
  pageUrl: string,
): Partial<ExtractedProduct> {
  const looksLikeHtml = /<html|<head|<meta|<body|<!doctype/i.test(
    body.slice(0, 4000),
  );

  if (looksLikeHtml) {
    const product = extractFromHtml(body, pageUrl);
    if (product.title) return product;
  }

  return parseJinaMarkdown(body, pageUrl);
}

/**
 * De platte-tekstvorm van Jina begint met kopregels ("Title:", "URL Source:")
 * gevolgd door de pagina als markdown.
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
 * Bevraagt alle leesdiensten tegelijk en geeft de eerste terug die een
 * bruikbare productnaam oplevert.
 *
 * Naast elkaar in plaats van na elkaar, want anders bepaalt de traagste dienst
 * hoe lang je zit te wachten — en welke winkel welke dienst doorlaat, verschilt
 * per geval. Een dienst die faalt of niets bruikbaars vindt telt gewoon niet
 * mee; ze mogen de app nooit laten klappen.
 */
export async function readViaFallbacks(
  url: string,
): Promise<ReaderOutcome | null> {
  if (!readersEnabled()) return null;

  // Eerst de diensten die de winkel nú bekijken. Pas als die allemaal geweerd
  // worden, vallen we terug op het archief — dat levert per definitie oudere
  // gegevens, dus daar willen we niet te snel bij uitkomen.
  const live = await raceForResult([
    readViaJina,
    readViaAllOrigins,
    readViaCodeTabs,
    readViaMicrolink,
  ], url);
  if (live) return live;

  return raceForResult([readViaWayback], url);
}

type Reader = (url: string) => Promise<ReaderOutcome | null>;

/** Start alle diensten tegelijk en geeft de eerste bruikbare uitkomst terug. */
function raceForResult(readers: Reader[], url: string) {
  return new Promise<ReaderOutcome | null>((resolve) => {
    let pending = readers.length;
    let settled = false;

    const finish = (outcome: ReaderOutcome | null) => {
      if (settled) return;
      if (outcome) {
        settled = true;
        resolve(outcome);
        return;
      }
      pending -= 1;
      if (pending === 0) {
        settled = true;
        resolve(null);
      }
    };

    for (const reader of readers) {
      reader(url)
        .then(finish)
        .catch(() => finish(null));
    }
  });
}

/** Leest een pagina die we via een dienst binnenkregen als gewone HTML. */
export function extractFromHtml(html: string, pageUrl: string) {
  const product = extractProduct(html, pageUrl);
  return { ...product, title: cleanTitle(product.title, safeHostname(pageUrl)) };
}
