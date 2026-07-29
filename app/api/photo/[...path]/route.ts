import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  PHOTO_BLOB,
  PHOTO_LOCAL,
  blobToken,
  localPhotoDirectory,
} from "@/lib/storage";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/** Een jaar is prima: de naam is willekeurig en verandert nooit. */
const CACHE = "public, max-age=31536000, immutable";

/**
 * Serveert een opgeslagen foto.
 *
 * Twee soorten. `local/…` staat op de schijf van de server: die bestanden
 * belanden ná de build in public/, en dan serveert Next ze zelf niet meer —
 * vandaar deze route. `gifts/…` staat in een besloten Blob-store, waar de
 * adressen niet rechtstreeks op te vragen zijn; die halen we op met onze eigen
 * sleutel en geven we door.
 *
 * Geen inlogcontrole: een gedeelde lijst hoort ook te werken voor bezoekers
 * zonder account, en het pad is niet te raden.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const pathname = parts.join("/");

  if (PHOTO_LOCAL.test(pathname)) {
    const name = pathname.slice("local/".length);
    const bytes = await readFile(path.join(localPhotoDirectory(), name)).catch(
      () => null,
    );
    if (!bytes) return new NextResponse(null, { status: 404 });

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": TYPES[name.split(".").pop() ?? ""] ?? "image/jpeg",
        "cache-control": CACHE,
      },
    });
  }

  if (!PHOTO_BLOB.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const token = blobToken();
  if (!token) return new NextResponse(null, { status: 404 });

  const { get } = await import("@vercel/blob");
  const result = await get(pathname, {
    access: "private",
    token: token.value,
  }).catch(() => null);

  if (!result || result.statusCode !== 200) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "content-type": result.blob.contentType,
      "content-length": String(result.blob.size),
      "cache-control": CACHE,
    },
  });
}
