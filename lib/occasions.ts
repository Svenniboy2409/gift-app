import type { MessageKey, Translator } from "@/lib/i18n";

/**
 * Hoe een gelegenheid op het scherm komt te staan.
 *
 * De vaste gelegenheden — verjaardag, kerst, bruiloft — hebben een vertaling.
 * Bij "Anders" mag je zelf zeggen waar de lijst voor is; staat daar niets, dan
 * blijft het gewoon "Anders".
 *
 * Dit staat los van de database-laag: de kaartjes en de banners zijn allebei
 * componenten die alleen de lijst en een vertaalfunctie hebben.
 */
export function occasionLabel(
  list: { occasion: string; occasionNote?: string | null },
  t: Translator,
) {
  const eigen = list.occasionNote?.trim();
  if (list.occasion === "OTHER" && eigen) return eigen;
  return t(`occasion.${list.occasion}` as MessageKey);
}
