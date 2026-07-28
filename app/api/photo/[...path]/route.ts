import { NextResponse } from "next/server";
import { PHOTO_PATHNAME, blobToken } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Serveert een foto uit een besloten Blob-store.
 *
 * Een store staat op openbaar of op besloten; dat kies je bij het aanmaken.
 * Bij een besloten store zijn de blob-adressen zelf niet op te vragen, dus
 * halen we het bestand hier op met onze eigen sleutel en geven we het door.
 * Geen inlogcontrole: een gedeelde lijst hoort ook te werken voor bezoekers
 * zonder account, en het pad is niet te raden.
 *
 * De naam is een willekeurige reeks van 24 tekens en verandert nooit, dus het
 * CDN mag hem eeuwig bewaren — daarna kost dit niets meer.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const pathname = path.join("/");

  // Alleen onze eigen bestandsnamen: geen willekeurige paden uit de store.
  if (!PHOTO_PATHNAME.test(pathname)) {
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
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
