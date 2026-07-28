import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  ALLOWED_IMAGE_TYPES,
  HEIF_TYPES,
  sniffImageType,
} from "@/lib/image-type";
import { rateLimit } from "@/lib/rate-limit";
import { StorageError, storeImage } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * De browser verkleint foto's al tot ongeveer 500 kB, dus dit is puur een
 * vangnet. Bewust onder de 4,5 MB die Vercel zelf als grens voor een verzoek
 * aanhoudt: dan komt een te grote foto bij ons uit op een duidelijke melding in
 * plaats van een kale foutcode van het platform.
 */
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(`upload:${user.id}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no-file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too-large" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Het type dat de browser meestuurt is niet betrouwbaar (iPhones laten het
  // soms leeg), dus we kijken naar de bytes zelf.
  const type = sniffImageType(bytes);
  if (type && HEIF_TYPES.has(type)) {
    return NextResponse.json({ error: "heic-image" }, { status: 415 });
  }
  if (!type || !ALLOWED_IMAGE_TYPES.has(type)) {
    return NextResponse.json({ error: "unsupported-type" }, { status: 415 });
  }

  try {
    const url = await storeImage(bytes, type);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    // Alles wat hier nog langskomt is een storing bij de opslagdienst zelf.
    // Beter een herkenbare melding dan een kale 500 zonder uitleg.
    console.error("upload failed", error);
    return NextResponse.json({ error: "storage-failed" }, { status: 502 });
  }
}
