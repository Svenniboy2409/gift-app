import type { MessageKey } from "@/lib/i18n";

/**
 * De foutcodes die de uploadroute en de zelftest teruggeven, elk met een eigen
 * uitleg. Zonder deze vertaalslag komt alles uit op "er ging iets mis", en dan
 * weet je niet of je een andere foto moet kiezen of dat er iets aan de server
 * mankeert.
 */
export const UPLOAD_ERRORS: Record<string, MessageKey> = {
  "storage-unconfigured": "error.storage-unconfigured",
  "storage-failed": "error.storage-failed",
  "storage-token-invalid": "error.storage-token-invalid",
  "storage-store-missing": "error.storage-store-missing",
  "storage-suspended": "error.storage-suspended",
  "storage-busy": "error.storage-busy",
  "storage-type-blocked": "error.storage-type-blocked",
  "too-large": "error.image-too-large",
  "heic-image": "error.heic-image",
  "unsupported-type": "error.unsupported-image",
  "rate-limited": "error.too-many-uploads",
  unauthorized: "error.session-expired",
};

export function uploadErrorKey(code: string | undefined): MessageKey {
  return (code && UPLOAD_ERRORS[code]) || "error.generic";
}
