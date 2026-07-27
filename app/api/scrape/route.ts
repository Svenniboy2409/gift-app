import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { extractProduct } from "@/lib/scraper/extract";
import { hintsFromUrl } from "@/lib/scraper/from-url";
import { FetchBlockedError, fetchHtml, fetchImage } from "@/lib/scraper/safe-fetch";
import { storeImage } from "@/lib/storage";

export const runtime = "nodejs";

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

/** Downloadt een afbeelding en bewaart er een eigen kopie van. */
async function storeRemoteImage(imageUrl: string | null, referer: string) {
  if (!imageUrl) return null;
  try {
    const image = await fetchImage(imageUrl, referer);
    return image ? await storeImage(image.bytes, image.contentType) : null;
  } catch {
    return null;
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

  async function fromHintsOnly(reason: string): Promise<Response> {
    const storedImage = await storeRemoteImage(hints.imageUrl, url!);
    return NextResponse.json<ScrapeResponse>({
      ok: Boolean(hints.title),
      quality: hints.title ? "partial" : "failed",
      reason,
      product: {
        title: hints.title,
        description: null,
        priceCents: null,
        currency: "EUR",
        imageUrl: storedImage,
        merchant: hints.merchant,
        url: url!,
      },
    });
  }

  let html = "";
  let finalUrl = url;
  try {
    const page = await fetchHtml(url);
    html = page.html;
    finalUrl = page.finalUrl;
    if (!html) {
      // 403/429 betekent bijna altijd een bot-blokkade van de webshop.
      return await fromHintsOnly(
        page.status === 403 || page.status === 429 ? "blocked" : "fetch-failed",
      );
    }
  } catch (error) {
    const reason =
      error instanceof FetchBlockedError ? error.message : "fetch-failed";
    if (reason === "private-address" || reason === "invalid-protocol") {
      return NextResponse.json({ error: reason }, { status: 400 });
    }
    return await fromHintsOnly(reason);
  }

  const product = extractProduct(html, finalUrl);

  // De pagina kwam binnen, maar sommige shops serveren dan alsnog een
  // controlepagina zonder productgegevens. Dan vult de link het gat.
  const title = product.title ?? hints.title;

  // Eigen kopie van de afbeelding, zodat hij blijft werken als de shop de
  // originele URL wijzigt of hotlinken blokkeert.
  const storedImage =
    (await storeRemoteImage(product.imageUrl, finalUrl)) ??
    (await storeRemoteImage(hints.imageUrl, finalUrl));

  const quality: ScrapeResponse["quality"] = !title
    ? "failed"
    : product.priceCents === null || !storedImage
      ? "partial"
      : "ok";

  return NextResponse.json<ScrapeResponse>({
    ok: Boolean(title),
    quality,
    product: {
      title,
      description: product.description,
      priceCents: product.priceCents,
      currency: product.currency ?? "EUR",
      imageUrl: storedImage,
      merchant: product.merchant ?? hints.merchant,
      url: finalUrl,
    },
  });
}
