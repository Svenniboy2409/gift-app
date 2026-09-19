/**
 * De omslagkleuren van een lijst, en wat ze verder kleuren.
 *
 * Dit bestand staat bewust los van de database-laag: zowel de server als het
 * formulier in de browser heeft de lijst nodig, en die laatste mag niets uit
 * `server-only` importeren.
 */

/**
 * De volgorde is die van het kleurenwiel, met terracotta — de kleur van de app
 * zelf — vooraan en het enige neutraal achteraan.
 */
export const COVER_COLORS = [
  "terracotta",
  "amber",
  "olive",
  "forest",
  "teal",
  "ocean",
  "midnight",
  "lavender",
  "plum",
  "rose",
  "cherry",
  "sand",
] as const;

export type CoverColor = (typeof COVER_COLORS)[number];

export function isCoverColor(value: string): value is CoverColor {
  return (COVER_COLORS as readonly string[]).includes(value);
}

/**
 * De klasse die het accent van een lijst zet: de knoppen, de prijzen en de
 * randen nemen de kleur van de omslag over. Zie `app/globals.css`.
 *
 * Zet hem op het buitenste vak van alles wat bij die ene lijst hoort; de
 * variabelen erven vanzelf door naar beneden.
 */
export function accentClass(coverColor: string) {
  return `accent-${isCoverColor(coverColor) ? coverColor : "terracotta"}`;
}
