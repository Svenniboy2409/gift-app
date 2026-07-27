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
 * Slaat een afbeelding op en geeft de publieke URL terug.
 *
 * Met een BLOB_READ_WRITE_TOKEN gaat het naar Vercel Blob (nodig op Vercel,
 * want het bestandssysteem daar is niet schrijfbaar). Zonder token schrijven we
 * naar public/uploads, wat prima werkt bij lokaal draaien of zelf hosten.
 */
export class StorageError extends Error {}

export async function storeImage(
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const name = `${randomBytes(12).toString("hex")}.${extensionFor(contentType)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`gifts/${name}`, Buffer.from(bytes), {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
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
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      throw new StorageError("storage-unconfigured");
    }
    throw error;
  }
  return `/uploads/${name}`;
}
