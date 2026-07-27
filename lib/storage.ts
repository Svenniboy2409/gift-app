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
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), bytes);
  return `/uploads/${name}`;
}
