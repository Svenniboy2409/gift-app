import * as cheerio from "cheerio";
import { parseMachinePrice, parsePrice } from "@/lib/scraper/price";
import { findSiteRule, merchantFromHost } from "@/lib/scraper/sites";

export type ExtractedProduct = {
  title: string | null;
  description: string | null;
  priceCents: number | null;
  currency: string | null;
  imageUrl: string | null;
  merchant: string | null;
};

type Cheerio = cheerio.CheerioAPI;

function clean(value: string | null | undefined) {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function absolute(url: string | null, base: string) {
  if (!url) return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

function meta($: Cheerio, ...names: string[]) {
  for (const name of names) {
    const value =
      $(`meta[property="${name}"]`).attr("content") ??
      $(`meta[name="${name}"]`).attr("content") ??
      $(`meta[itemprop="${name}"]`).attr("content");
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return null;
}

/** Alle JSON-LD-blokken, plat geslagen (ook @graph en arrays). */
function jsonLdNodes($: Cheerio): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  const push = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    const node = value as Record<string, unknown>;
    nodes.push(node);
    if (Array.isArray(node["@graph"])) node["@graph"].forEach(push);
  };

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text().trim();
    if (!raw) return;
    try {
      push(JSON.parse(raw));
    } catch {
      // Sommige shops zetten er ongeldige JSON in; die slaan we over.
    }
  });

  return nodes;
}

function typeOf(node: Record<string, unknown>) {
  const value = node["@type"];
  if (typeof value === "string") return [value.toLowerCase()];
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string").map((v) => v.toLowerCase());
  }
  return [];
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") return clean(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    return firstString(node.url ?? node.contentUrl ?? node["@id"] ?? node.name);
  }
  return null;
}

function offersOf(node: Record<string, unknown>): Record<string, unknown>[] {
  const offers = node.offers;
  if (!offers) return [];
  if (Array.isArray(offers)) {
    return offers.filter(
      (o): o is Record<string, unknown> => !!o && typeof o === "object",
    );
  }
  if (typeof offers === "object") return [offers as Record<string, unknown>];
  return [];
}

function fromJsonLd($: Cheerio): Partial<ExtractedProduct> {
  const product = jsonLdNodes($).find((node) =>
    typeOf(node).some((type) =>
      ["product", "individualproduct", "productmodel"].includes(type),
    ),
  );
  if (!product) return {};

  let priceCents: number | null = null;
  let currency: string | null = null;

  for (const offer of offersOf(product)) {
    const spec =
      offer.priceSpecification && typeof offer.priceSpecification === "object"
        ? (offer.priceSpecification as Record<string, unknown>)
        : null;
    const raw =
      offer.price ??
      offer.lowPrice ??
      spec?.price ??
      (spec?.["minPrice"] as unknown);
    const parsed = parseMachinePrice(
      typeof raw === "string" || typeof raw === "number" ? raw : null,
    );
    if (parsed !== null) {
      priceCents = parsed;
      currency =
        firstString(offer.priceCurrency ?? spec?.priceCurrency) ?? null;
      break;
    }
  }

  return {
    title: firstString(product.name),
    description: firstString(product.description),
    imageUrl: firstString(product.image),
    priceCents,
    currency: currency ? currency.toUpperCase() : null,
    merchant: firstString(
      (product.brand as Record<string, unknown> | undefined)?.name ??
        product.brand,
    ),
  };
}

function fromMicrodata($: Cheerio): Partial<ExtractedProduct> {
  const scope = $('[itemtype*="schema.org/Product"]').first();
  // cheerio.load() voegt altijd een <body> toe, dus dit is een veilige scope.
  const root = scope.length > 0 ? scope : $("body");

  const priceRaw =
    root.find('[itemprop="price"]').first().attr("content") ??
    root.find('[itemprop="price"]').first().text();
  const currency =
    root.find('[itemprop="priceCurrency"]').first().attr("content") ?? null;

  return {
    title: clean(
      root.find('[itemprop="name"]').first().attr("content") ??
        root.find('[itemprop="name"]').first().text(),
    ),
    priceCents: parseMachinePrice(clean(priceRaw)),
    currency: currency ? currency.toUpperCase() : null,
    imageUrl: clean(
      root.find('[itemprop="image"]').first().attr("content") ??
        root.find('[itemprop="image"]').first().attr("src"),
    ),
  };
}

function fromOpenGraph($: Cheerio): Partial<ExtractedProduct> {
  const priceRaw = meta(
    $,
    "og:price:amount",
    "product:price:amount",
    "twitter:data1",
  );
  const currency = meta($, "og:price:currency", "product:price:currency");

  return {
    title: meta($, "og:title", "twitter:title"),
    description: meta($, "og:description", "twitter:description", "description"),
    imageUrl: meta(
      $,
      "og:image:secure_url",
      "og:image",
      "twitter:image",
      "twitter:image:src",
    ),
    priceCents: parseMachinePrice(priceRaw) ?? parsePrice(priceRaw)?.cents ?? null,
    currency: currency ? currency.toUpperCase() : null,
    merchant: meta($, "og:site_name"),
  };
}

function textFromSelectors($: Cheerio, selectors: string[] | undefined) {
  if (!selectors) return null;
  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length === 0) continue;
    const value = clean(element.attr("content") ?? element.text());
    if (value) return value;
  }
  return null;
}

function imageFromSelectors($: Cheerio, selectors: string[] | undefined) {
  if (!selectors) return null;
  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length === 0) continue;
    const srcset = element.attr("srcset");
    const value =
      element.attr("src") ??
      element.attr("data-src") ??
      element.attr("data-zoom-image") ??
      (srcset ? srcset.split(",")[0]?.trim().split(" ")[0] : undefined);
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return null;
}

/** Laatste redmiddel: paginatitel en de eerste redelijk grote afbeelding. */
function fromFallback($: Cheerio): Partial<ExtractedProduct> {
  const heading = clean($("h1").first().text());
  const pageTitle = clean($("title").first().text());

  let imageUrl: string | null = null;
  $("img").each((_, element) => {
    if (imageUrl) return;
    const img = $(element);
    const width = Number.parseInt(img.attr("width") ?? "0", 10);
    const src = clean(img.attr("src") ?? img.attr("data-src"));
    if (!src || src.startsWith("data:")) return;
    if (/sprite|logo|icon|pixel|placeholder/i.test(src)) return;
    if (width && width < 200) return;
    imageUrl = src;
  });

  return { title: heading ?? pageTitle, imageUrl };
}

/** Titels als "Blauwe trui | bol.com" worden ingekort tot het productdeel. */
function trimSiteSuffix(title: string | null, siteName: string | null) {
  if (!title) return null;
  let value = title;
  if (siteName) {
    const pattern = new RegExp(
      `\\s*[|\\-–—·]\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
      "i",
    );
    value = value.replace(pattern, "");
  }
  return clean(value)?.slice(0, 160) ?? null;
}

/**
 * Leest een productpagina uit. De volgorde is: JSON-LD → microdata →
 * OpenGraph → shop-specifieke selectors → paginatitel. Per veld wint de eerste
 * bruikbare waarde; alleen bij `preferPrice` gaat de shop-specifieke prijs voor.
 */
export function extractProduct(html: string, pageUrl: string): ExtractedProduct {
  const $ = cheerio.load(html);
  const hostname = (() => {
    try {
      return new URL(pageUrl).hostname;
    } catch {
      return "";
    }
  })();
  const rule = findSiteRule(hostname);

  const layers = [fromJsonLd($), fromMicrodata($), fromOpenGraph($)];
  const siteLayer: Partial<ExtractedProduct> = rule
    ? {
        title: textFromSelectors($, rule.title),
        priceCents: parsePrice(textFromSelectors($, rule.price))?.cents ?? null,
        currency: parsePrice(textFromSelectors($, rule.price))?.currency ?? null,
        imageUrl: imageFromSelectors($, rule.image),
      }
    : {};

  const ordered = rule?.preferPrice
    ? [siteLayer, ...layers, fromFallback($)]
    : [...layers, siteLayer, fromFallback($)];

  const pick = <K extends keyof ExtractedProduct>(key: K) => {
    for (const layer of ordered) {
      const value = layer[key];
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return null;
  };

  const siteName = meta($, "og:site_name");
  const imageUrl = absolute(pick("imageUrl") as string | null, pageUrl);

  return {
    title: trimSiteSuffix(pick("title") as string | null, siteName),
    description:
      (pick("description") as string | null)?.slice(0, 600) ?? null,
    priceCents: pick("priceCents") as number | null,
    currency: (pick("currency") as string | null) ?? "EUR",
    imageUrl,
    merchant: hostname ? merchantFromHost(hostname) : null,
  };
}
