import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function extensionFor(contentType: string) {
  return EXTENSIONS[contentType] ?? "jpg";
}

/**
 * Een opslagfout met een code die de app kan vertalen, plus de oorspronkelijke
 * tekst. Die tekst tonen we erbij: zonder toegang tot de logs van Vercel is dat
 * het enige houvast om te zien wat de opslagdienst precies terugstuurde.
 */
export class StorageError extends Error {
  constructor(
    code: string,
    readonly detail?: string,
  ) {
    super(code);
  }
}

/**
 * Vertaalt een fout van Vercel Blob naar een eigen code. We kijken naar de
 * tekst en niet naar de klasse: bij het bouwen worden klassenamen ingekort,
 * maar de meldingen zelf blijven staan.
 */
function blobErrorCode(message: string) {
  if (message.includes("Access denied")) return "storage-token-invalid";
  if (message.includes("Token expired")) return "storage-token-invalid";
  if (message.includes("No read-write token")) return "storage-unconfigured";
  if (message.includes("This store does not exist")) return "storage-store-missing";
  if (message.includes("suspended")) return "storage-suspended";
  if (message.includes("not available") || message.includes("rate limit")) {
    return "storage-busy";
  }
  if (message.includes("file length cannot be greater")) return "too-large";
  if (message.includes("is not allowed")) return "storage-type-blocked";
  return "storage-failed";
}

/**
 * Zoekt de sleutel van de Blob-opslag op.
 *
 * Meestal heet die `BLOB_READ_WRITE_TOKEN`, maar Vercel laat je bij het
 * koppelen van een store een eigen voorvoegsel kiezen — dan komt hij binnen als
 * bijvoorbeeld `FOTOS_READ_WRITE_TOKEN`. Daarom vallen we terug op elke
 * variabele die op `_READ_WRITE_TOKEN` eindigt en er als een Blob-sleutel
 * uitziet. Zo werkt het ook als de store onder een andere naam gekoppeld is.
 */
export function blobToken(): { name: string; value: string } | null {
  const direct = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (direct) return { name: "BLOB_READ_WRITE_TOKEN", value: direct };

  for (const [name, value] of Object.entries(process.env)) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    if (name.endsWith("_READ_WRITE_TOKEN") && trimmed.startsWith("vercel_blob_rw_")) {
      return { name, value: trimmed };
    }
  }
  return null;
}

/** Draaien we op Vercel? Daar is het bestandssysteem geen optie. */
function onVercel() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/** Een geldige PNG van 1×1, voor de zelftest hieronder. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Zet een testbestandje neer en ruimt het meteen weer op. Zo is met één druk op
 * de knop te zien of de foto-opslag écht werkt, in plaats van dat je daar pas bij
 * de eerste upload achter komt.
 */
export async function checkStorage() {
  const token = blobToken();
  const url = await storeImage(new Uint8Array(PIXEL), "image/png");

  if (token && url.startsWith("http")) {
    try {
      const { del } = await import("@vercel/blob");
      await del(url, { token: token.value });
    } catch {
      // Een achtergebleven testbestandje van 70 bytes is geen probleem.
    }
  }

  return {
    mode: token ? ("blob" as const) : ("filesystem" as const),
    // Alleen de naam van de variabele, nooit de waarde.
    tokenName: token?.name ?? null,
  };
}

/**
 * Slaat een afbeelding op en geeft de publieke URL terug.
 *
 * Met een BLOB_READ_WRITE_TOKEN gaat het naar Vercel Blob (nodig op Vercel,
 * want het bestandssysteem daar is niet schrijfbaar). Zonder token schrijven we
 * naar public/uploads, wat prima werkt bij lokaal draaien of zelf hosten.
 */
export async function storeImage(
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const name = `${randomBytes(12).toString("hex")}.${extensionFor(contentType)}`;

  const token = blobToken();
  if (token) {
    const { put } = await import("@vercel/blob");
    try {
      const blob = await put(`gifts/${name}`, Buffer.from(bytes), {
        access: "public",
        contentType,
        token: token.value,
      });
      return blob.url;
    } catch (error) {
      const message = (error as Error).message ?? "";
      throw new StorageError(blobErrorCode(message), message.slice(0, 300));
    }
  }

  // Op Vercel is er niets om naar te schrijven: het bestandssysteem is
  // alleen-lezen en /var/task/public bestaat niet eens. Meteen zeggen dat de
  // koppeling ontbreekt is duidelijker dan het toch proberen.
  if (onVercel()) {
    throw new StorageError(
      "storage-unconfigured",
      "geen BLOB_READ_WRITE_TOKEN gevonden in deze deployment",
    );
  }

  const directory = path.join(process.cwd(), "public", "uploads");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, name), bytes);
  } catch (error) {
    // Op Vercel is het bestandssysteem alleen-lezen. Zonder Blob-token loopt
    // het opslaan daar dus stuk; geef dat als duidelijke oorzaak terug in
    // plaats van een kale 500.
    const code = (error as NodeJS.ErrnoException).code;
    if (["EROFS", "EACCES", "EPERM", "ENOENT", "ENOTDIR"].includes(code ?? "")) {
      throw new StorageError(
        "storage-unconfigured",
        `${code}: kon niet naar ${directory} schrijven`,
      );
    }
    throw error;
  }
  return `/uploads/${name}`;
}
