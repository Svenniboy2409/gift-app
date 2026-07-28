/**
 * Herkent het soort afbeelding aan de eerste bytes van het bestand.
 *
 * De browser geeft bij een upload een `type` mee, maar daar valt niet op te
 * bouwen: iPhones sturen bij een foto uit de galerij soms een leeg type mee, en
 * een enkele browser verzint iets als "application/octet-stream". Kijken naar de
 * bytes zelf is de enige betrouwbare manier.
 */

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export type AllowedImageType = (typeof ALLOWED_TYPES)[number];

/** De formaten die we opslaan; alles wat elke browser zonder gedoe toont. */
export const ALLOWED_IMAGE_TYPES = new Set<string>(ALLOWED_TYPES);

/**
 * HEIC/HEIF: wat een iPhone standaard maakt. We slaan het niet op — buiten
 * Apple-apparaten laat vrijwel geen browser het zien — maar we willen het wel
 * herkennen, zodat de melding kan uitleggen wat er aan de hand is.
 */
export const HEIF_TYPES = new Set(["image/heic", "image/heif"]);

function ascii(bytes: Uint8Array, start: number, length: number) {
  let text = "";
  for (let index = start; index < start + length && index < bytes.length; index++) {
    text += String.fromCharCode(bytes[index]);
  }
  return text;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Geeft het mediatype terug dat bij de bytes hoort, of null als we het niet
 * herkennen. Herkent ook HEIC/HEIF, zodat de aanroeper daar apart op kan
 * reageren.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";

  // RIFF-container: "RIFF" .... "WEBP"
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }

  // ISO-BMFF-container (AVIF, HEIC, HEIF): "....ftyp" plus een merk.
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (brand === "heic" || brand === "heix" || brand === "hevc") return "image/heic";
    if (brand === "mif1" || brand === "msf1" || brand === "heim") return "image/heif";
  }

  return null;
}
