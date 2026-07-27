import nl from "@/messages/nl.json";
import en from "@/messages/en.json";

export const LOCALES = ["nl", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "nl";
export const LOCALE_COOKIE = "wenslijst_locale";

export type Messages = typeof nl;
export type MessageKey = keyof Messages;

const dictionaries: Record<Locale, Record<string, string>> = { nl, en };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function getMessages(locale: Locale): Record<string, string> {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export type Translator = (
  key: MessageKey,
  values?: Record<string, string | number>,
) => string;

/** Maakt een vertaalfunctie. Onbekende sleutels geven de sleutel zelf terug. */
export function createTranslator(messages: Record<string, string>): Translator {
  return (key, values) => {
    const template = messages[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    );
  };
}

/** Prijs in centen → "€ 19,95" in de juiste taal. */
export function formatPrice(
  cents: number | null | undefined,
  currency: string,
  locale: Locale,
) {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-GB", {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
}

export function formatDate(date: Date | string, locale: Locale) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

/** Hele dagen tot een datum. Negatief = in het verleden. */
export function daysUntil(date: Date | string) {
  const target = typeof date === "string" ? new Date(date) : date;
  const startOfDay = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = startOfDay(target) - startOfDay(new Date());
  return Math.round(diff / 86_400_000);
}
