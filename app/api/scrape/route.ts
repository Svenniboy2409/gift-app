import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { extractProduct } from "@/lib/scraper/extract";
import { FetchBlockedError, fetchHtml, fetchImage } from "@/lib/scraper/safe-fetch";
import { storeImage } from "@/lib/storage";

export const runtime = "nodejs";

export type ScrapeResponse = {
  ok: boolean;
  /** "ok" = alles gevonden, "partial" = titel maar geen prijs, "failed" = niets */
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

  const empty: ScrapeResponse["product"] = {
    title: null,
    description: null,
    priceCents: null,
    currency: "EUR",
    imageUrl: null,
    merchant: null,
    url,
  };

  let html = "";
  let finalUrl = url;
  try {
    const page = await fetchHtml(url);
    html = page.html;
    finalUrl = page.finalUrl;
    if (!html) {
      // 403/503 betekent bijna altijd een bot-blokkade van de webshop.
      return NextResponse.json<ScrapeResponse>({
        ok: false,
        quality: "failed",
        reason: page.status === 403 || page.status === 429 ? "blocked" : "fetch-failed",
        product: empty,
      });
    }
  } catch (error) {
    const reason =
      error instanceof FetchBlockedError ? error.message : "fetch-failed";
    const status = reason === "private-address" || reason === "invalid-protocol" ? 400 : 200;
    if (status === 400) {
      return NextResponse.json({ error: reason }, { status: 400 });
    }
    return NextResponse.json<ScrapeResponse>({
      ok: false,
      quality: "failed",
      reason,
      product: empty,
    });
  }

  const product = extractProduct(html, finalUrl);

  // Eigen kopie van de afbeelding, zodat hij blijft werken als de shop de
  // originele URL wijzigt of hotlinken blokkeert.
  let storedImage: string | null = null;
  if (product.imageUrl) {
    try {
      const image = await fetchImage(product.imageUrl, finalUrl);
      if (image) storedImage = await storeImage(image.bytes, image.contentType);
    } catch {
      storedImage = null;
    }
  }

  const quality: ScrapeResponse["quality"] = !product.title
    ? "failed"
    : product.priceCents === null || !storedImage
      ? "partial"
      : "ok";

  return NextResponse.json<ScrapeResponse>({
    ok: Boolean(product.title),
    quality,
    product: {
      title: product.title,
      description: product.description,
      priceCents: product.priceCents,
      currency: product.currency ?? "EUR",
      imageUrl: storedImage,
      merchant: product.merchant,
      url: finalUrl,
    },
  });
}
