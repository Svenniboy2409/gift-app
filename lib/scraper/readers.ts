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
 * Allemaal gratis en zonder sleutel.
 *
 * Ze vullen elkaar aan in plaats van elkaar te vervangen: elke dienst levert
 * vaak nét iets anders, en wat de één mist kan de ander wel hebben. We
 * verzamelen dus alles wat binnenkomt en houden per veld de eerste bruikbare
 * waarde. Zodra naam, prijs én foto binnen zijn stoppen we.
 *
 * Uit te zetten met SCRAPER_READERS=off, mocht je liever niets naar derden
 * sturen. Het gaat om openbare productlinks, verder niets.
 */

export type ReaderOutcome = {
  product: Partial<ExtractedProduct>;
  source: string;
};

/**
 * Deze diensten halen een hele pagina op en voeren soms ook nog JavaScript uit,
 * en dat kost tijd. Ze draaien naast elkaar, dus dit is de grens voor de hele
 * live-ronde — niet per dienst opgeteld.
 */
const READER_TIMEOUT_MS = 18_000;

/**
 * Het archief doet twee verzoeken achter elkaar (eerst kijken of er een kopie
 * is, dan die kopie ophalen), dus daar telt de tijd wél op. Samen met de
 * live-ronde blijft het geheel ruim onder de maxDuration van de route.
 */
const WAYBACK_TIMEOUT_MS = 10_000;

function readersEnabled() {
  return process.env.SCRAPER_READERS !== "off";
}

/**
 * Heeft deze dienst iets opgeleverd waar we wat aan hebben? Let op: een dienst
 * die alleen een prijs of een foto vindt telt óók mee. Ze vullen elkaar aan,
 * dus een halve vondst is geen mislukking.
 */
function hasAnything(product: Partial<ExtractedProduct>) {
  return Boolean(
    product.title || product.imageUrl || product.priceCents != null,
  );
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
  return hasAnything(product) ? { product, source: "jina" } : null;
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
  return hasAnything(product) ? { product, source: "allorigins" } : null;
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
  return hasAnything(product) ? { product, source: "codetabs" } : null;
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
      timeoutMs: WAYBACK_TIMEOUT_MS,
      headers: { Accept: "application/json" },
    },
  );
  if (!lookup.html) return null;

  const raw = waybackSnapshotUrl(lookup.html);
  if (!raw) return null;

  const page = await fetchHtml(raw, {
    allowText: true,
    timeoutMs: WAYBACK_TIMEOUT_MS,
  });
  if (!page.html) return null;

  const product = parseReaderText(page.html, url);
  return hasAnything(product) ? { product, source: "wayback" } : null;
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
  return hasAnything(product) ? { product, source: "microlink" } : null;
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

  if (!looksLikeHtml) return parseJinaMarkdown(body, pageUrl);

  // Ook bij HTML nog even door de tekstvorm halen: soms staat de prijs wel in
  // de zichtbare tekst maar niet in de metadata.
  const fromHtml = extractFromHtml(body, pageUrl);
  return mergeProduct(fromHtml, parseJinaMarkdown(body, pageUrl));
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


/** Leest een pagina die we via een dienst binnenkregen als gewone HTML. */
export function extractFromHtml(html: string, pageUrl: string) {
  const product = extractProduct(html, pageUrl);
  return { ...product, title: cleanTitle(product.title, safeHostname(pageUrl)) };
}

/* --- De keten: per veld aanvullen ---------------------------------------- */

type Reader = (url: string) => Promise<ReaderOutcome | null>;

const LIVE_READERS: Reader[] = [
  readViaJina,
  readViaAllOrigins,
  readViaCodeTabs,
  readViaMicrolink,
];

/** De velden waar het om draait. Ontbreekt er één, dan zoeken we door. */
export function isComplete(product: Partial<ExtractedProduct>) {
  return Boolean(product.title && product.imageUrl) && product.priceCents != null;
}

function has(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

/**
 * Vult ontbrekende velden aan uit een tweede bron. Wat we al hadden blijft
 * staan: eerdere bronnen zijn betrouwbaarder dan latere.
 */
export function mergeProduct(
  base: Partial<ExtractedProduct>,
  extra: Partial<ExtractedProduct>,
): Partial<ExtractedProduct> {
  const merged: Partial<ExtractedProduct> = { ...base };
  for (const key of [
    "title",
    "description",
    "priceCents",
    "currency",
    "imageUrl",
    "merchant",
  ] as const) {
    if (!has(merged[key]) && has(extra[key])) {
      // @ts-expect-error — sleutel en waarde horen per definitie bij elkaar.
      merged[key] = extra[key];
    }
  }
  return merged;
}

export type GatherResult = {
  product: Partial<ExtractedProduct>;
  /** Welke diensten iets hebben bijgedragen. */
  sources: string[];
};

/**
 * Laat een groep diensten tegelijk los op dezelfde link en voegt alles wat
 * binnenkomt samen. Zodra alle velden gevuld zijn stoppen we; anders wachten we
 * tot iedereen klaar is, zodat één trage dienst niet betekent dat we een veld
 * missen dat hij wél had kunnen leveren.
 */
export function gatherFrom(
  readers: Reader[],
  url: string,
  base: Partial<ExtractedProduct>,
): Promise<GatherResult> {
  return new Promise((resolve) => {
    let merged = base;
    const sources: string[] = [];
    let pending = readers.length;
    let settled = false;

    const done = () => {
      if (settled) return;
      settled = true;
      resolve({ product: merged, sources });
    };

    const step = (outcome: ReaderOutcome | null) => {
      if (settled) return;
      if (outcome) {
        const before = merged;
        merged = mergeProduct(merged, outcome.product);
        // Alleen noteren als deze dienst daadwerkelijk iets toevoegde.
        if (JSON.stringify(before) !== JSON.stringify(merged)) {
          sources.push(outcome.source);
        }
      }
      pending -= 1;
      if (isComplete(merged) || pending === 0) done();
    };

    for (const reader of readers) {
      reader(url)
        .then(step)
        .catch(() => step(null));
    }
  });
}

/**
 * Vult de ontbrekende velden aan via de gratis leesdiensten.
 *
 * Eerst de diensten die de winkel nú bekijken; hun gegevens zijn actueel. Is
 * daarna nog iets leeg, dan mag het archief de rest invullen — ook als de live
 * diensten al een naam vonden. Een oude foto is namelijk nog steeds de juiste
 * foto, en een oude prijs is beter dan een leeg vakje dat je zelf moet opzoeken.
 */
export async function gatherProductData(
  url: string,
  base: Partial<ExtractedProduct> = {},
): Promise<GatherResult> {
  if (!readersEnabled() || isComplete(base)) {
    return { product: base, sources: [] };
  }

  const live = await gatherFrom(LIVE_READERS, url, base);
  if (isComplete(live.product)) return live;

  const withArchive = await gatherFrom([readViaWayback], url, live.product);
  return {
    product: withArchive.product,
    sources: [...live.sources, ...withArchive.sources],
  };
}
