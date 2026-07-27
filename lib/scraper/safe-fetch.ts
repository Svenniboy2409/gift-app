import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 12_000;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class FetchBlockedError extends Error {}

/**
 * Blokkeert adressen die naar het interne netwerk wijzen. Zonder deze controle
 * zou iemand de app kunnen gebruiken om onze eigen infrastructuur of de
 * metadata-service van de cloudprovider te bevragen (SSRF).
 */
function isPrivateAddress(address: string, family: number) {
  if (family === 6) {
    const value = address.toLowerCase();
    if (value === "::1" || value === "::") return true;
    if (value.startsWith("fe80") || value.startsWith("fc") || value.startsWith("fd")) {
      return true;
    }
    // IPv4-mapped IPv6, bijv. ::ffff:127.0.0.1
    const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1], 4);
    return false;
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // privé
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // privé
  if (a === 192 && b === 168) return true; // privé
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a >= 224) return true; // multicast + gereserveerd
  return false;
}

/** Controleert schema en host; gooit FetchBlockedError als het niet mag. */
export async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchBlockedError("invalid-url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FetchBlockedError("invalid-protocol");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");

  if (isIP(host)) {
    if (isPrivateAddress(host, isIP(host))) {
      throw new FetchBlockedError("private-address");
    }
    return url;
  }

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new FetchBlockedError("private-address");
  }

  let records: { address: string; family: number }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new FetchBlockedError("dns-failed");
  }
  if (records.length === 0) throw new FetchBlockedError("dns-failed");
  if (records.some((r) => isPrivateAddress(r.address, r.family))) {
    throw new FetchBlockedError("private-address");
  }

  return url;
}

async function readCapped(response: Response, limit: number) {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > limit) throw new FetchBlockedError("too-large");

  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new FetchBlockedError("too-large");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

/**
 * Volgt redirects handmatig zodat elke tussenstap opnieuw op een privé-adres
 * wordt gecontroleerd (anders kan een publieke URL alsnog naar 127.0.0.1 leiden).
 */
async function followedFetch(
  startUrl: string,
  headers: Record<string, string>,
) {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers,
        redirect: "manual",
        signal: controller.signal,
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        current = new URL(location, url).toString();
        continue;
      }
      return { response, finalUrl: url.toString() };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new FetchBlockedError("too-many-redirects");
}

export type FetchedPage = {
  html: string;
  finalUrl: string;
  status: number;
};

/** Haalt een HTML-pagina op met alle veiligheidsgrenzen. */
export async function fetchHtml(rawUrl: string): Promise<FetchedPage> {
  const { response, finalUrl } = await followedFetch(rawUrl, {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
  });

  if (!response.ok) {
    return { html: "", finalUrl, status: response.status };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html") && !contentType.includes("xml")) {
    throw new FetchBlockedError("not-html");
  }

  const bytes = await readCapped(response, MAX_HTML_BYTES);
  const charset = /charset=([\w-]+)/i.exec(contentType)?.[1] ?? "utf-8";
  let html: string;
  try {
    html = new TextDecoder(charset).decode(bytes);
  } catch {
    html = new TextDecoder("utf-8").decode(bytes);
  }

  return { html, finalUrl, status: response.status };
}

export type FetchedImage = {
  bytes: Uint8Array;
  contentType: string;
};

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/** Haalt een afbeelding op zodat we er een eigen kopie van kunnen bewaren. */
export async function fetchImage(
  rawUrl: string,
  referer?: string,
): Promise<FetchedImage | null> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
  };
  if (referer) headers.Referer = referer;

  const { response } = await followedFetch(rawUrl, headers);
  if (!response.ok) return null;

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) return null;

  const bytes = await readCapped(response, MAX_IMAGE_BYTES);
  if (bytes.length === 0) return null;
  return { bytes, contentType };
}

export const __testing = { isPrivateAddress };
