import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { ExtractedProduct } from "@/lib/scraper/extract";
import { hintsFromUrl } from "@/lib/scraper/from-url";
import {
  extractFromHtml,
  gatherProductData,
  isComplete,
  mergeProduct,
} from "@/lib/scraper/readers";
import { FetchBlockedError, fetchHtml, fetchImage } from "@/lib/scraper/safe-fetch";
import { storeImage } from "@/lib/storage";

export const runtime = "nodejs";

// De leesdiensten hebben even nodig om een pagina op te halen; de standaard
// van 10 seconden is dan te krap.
export const maxDuration = 45;

export type ScrapeResponse = {
  ok: boolean;
  /** "ok" = alles gevonden, "partial" = deels, "failed" = niets bruikbaars */
  quality: "ok" | "partial" | "failed";
  reason?: string;
  product: {
    title: string | null;
    description: string | null;
    priceCents: number | null;
    currency: string;
    imageUrl: string | null;
    merchant: string | null;
    url: string;
  };
};

/** Plakwerk opschonen: "bol.com/nl/p/..." → "https://bol.com/nl/p/...". */
function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Bewaart bij voorkeur een eigen kopie van de afbeelding, maar valt terug op de
 * originele URL.
 *
 * Dat terugvallen doet er echt toe. Zonder BLOB_READ_WRITE_TOKEN is het
 * bestandssysteem op Vercel niet schrijfbaar, en dan zou er nooit een foto
 * verschijnen. En áls we een plaatje zelf niet kunnen downloaden, wil dat nog
 * niet zeggen dat de bezoeker dat ook niet kan: die haalt hem op vanaf zijn
 * eigen verbinding, en daar hebben webshops geen bezwaar tegen.
 *
 * Een eigen kopie blijft beter — die overleeft het als de winkel de URL wijzigt
 * — dus we proberen dat eerst.
 */
async function storeRemoteImage(imageUrl: string | null, referer: string) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return null;

  try {
    const image = await fetchImage(imageUrl, referer);
    if (!image) return imageUrl;
    try {
      return await storeImage(image.bytes, image.contentType);
    } catch {
      // Geen opslag ingericht: dan linken we rechtstreeks naar de winkel.
      return imageUrl;
    }
  } catch {
    return imageUrl;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`scrape:${user.id}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate-limited", retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const rawUrl =
    body && typeof body === "object" && "url" in body
      ? String((body as { url: unknown }).url ?? "")
      : "";
  const url = normalizeUrl(rawUrl);
  if (!url) {
    return NextResponse.json({ error: "invalid-url" }, { status: 400 });
  }

  // Wat we sowieso uit de link zelf kunnen halen. Dit is ons vangnet: grote
  // webshops weren verzoeken vanaf datacenters, en dan komen we niet eens bij
  // de pagina. De productnaam staat meestal gewoon in de link, en bij Amazon
  // kunnen we uit de ASIN ook de foto opbouwen.
  const hints = hintsFromUrl(url);

  let product: Partial<ExtractedProduct> = {};
  let finalUrl = url;
  let reason: string | undefined;

  // Stap 1: zelf proberen. Werkt bij de meeste webshops.
  try {
    const page = await fetchHtml(url);
    finalUrl = page.finalUrl;
    if (page.html) {
      product = extractFromHtml(page.html, page.finalUrl);
    } else if (page.status === 403 || page.status === 429) {
      reason = "blocked";
    } else {
      reason = "fetch-failed";
    }
  } catch (error) {
    const failure =
      error instanceof FetchBlockedError ? error.message : "fetch-failed";
    if (failure === "private-address" || failure === "invalid-protocol") {
      return NextResponse.json({ error: failure }, { status: 400 });
    }
    reason = failure;
  }

  // Stap 2: ontbreekt er nog iets, dan vullen de gratis leesdiensten de gaten
  // aan — veld voor veld. Dat gebeurt ook als de pagina wél binnenkwam: soms
  // levert die alleen een naam op, of serveert de winkel een controlepagina.
  // Wat we al hebben blijft staan; alleen lege vakjes worden gevuld.
  if (!isComplete(product)) {
    const gathered = await gatherProductData(url, product);
    product = gathered.product;

    if (gathered.sources.includes("wayback")) {
      // Uit het archief? Dan kan de prijs achterhaald zijn.
      reason = "archived";
    } else if (gathered.sources.length > 0) {
      reason = undefined;
    }
  }

  // Stap 3: wat dan nog leeg is, vullen we met wat de link zelf prijsgeeft.
  product = mergeProduct(product, {
    title: hints.title,
    imageUrl: hints.imageUrl,
    merchant: hints.merchant,
  });

  const title = product.title ?? null;

  // Eigen kopie van de afbeelding, zodat hij blijft werken als de shop de
  // originele URL wijzigt of hotlinken blokkeert.
  const storedImage = await storeRemoteImage(
    product.imageUrl ?? null,
    finalUrl,
  );

  const quality: ScrapeResponse["quality"] = !title
    ? "failed"
    : product.priceCents == null || !storedImage
      ? "partial"
      : "ok";

  return NextResponse.json<ScrapeResponse>({
    ok: Boolean(title),
    quality,
    reason,
    product: {
      title,
      description: product.description ?? null,
      priceCents: product.priceCents ?? null,
      currency: product.currency ?? "EUR",
      imageUrl: storedImage,
      merchant: product.merchant ?? hints.merchant,
      url: finalUrl,
    },
  });
}
