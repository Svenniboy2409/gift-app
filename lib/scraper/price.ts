const CURRENCY_SYMBOLS: Record<string, string> = {
  "€": "EUR",
  "£": "GBP",
  $: "USD",
  "¥": "JPY",
  "₹": "INR",
  "zł": "PLN",
  "kr": "SEK",
  "CHF": "CHF",
};

export type ParsedPrice = { cents: number; currency: string | null };

/**
 * Leest een prijs uit vrije tekst. Kan overweg met Europese én Engelse
 * notatie: "€ 1.299,00", "19,95", "1,299.00", "vanaf €24,99", "EUR 30".
 */
export function parsePrice(input: string | null | undefined): ParsedPrice | null {
  if (!input) return null;
  const text = String(input).replace(/ /g, " ").trim();
  if (!text) return null;

  let currency: string | null = null;

  const isoMatch = /\b(EUR|USD|GBP|CHF|SEK|NOK|DKK|PLN|CZK|JPY)\b/i.exec(text);
  if (isoMatch) currency = isoMatch[1].toUpperCase();

  if (!currency) {
    for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
      if (text.includes(symbol)) {
        currency = code;
        break;
      }
    }
  }

  // Grijp de eerste getalachtige reeks, inclusief scheidingstekens.
  const match = /\d[\d.,  ]*\d|\d/.exec(text);
  if (!match) return null;

  const cents = normalizeAmount(match[0]);
  if (cents === null) return null;
  return { cents, currency };
}

/**
 * "1.299,00", "1,299.00", "1 299,00" en "35" → centen. Welk teken het
 * decimaalteken is, blijkt uit welk teken het laatst staat en hoeveel cijfers
 * erachter komen.
 */
function normalizeAmount(raw: string): number | null {
  const text = raw.replace(/[  ]/g, "");
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  const separator = lastComma > lastDot ? "," : lastDot > lastComma ? "." : null;

  let normalized: string;
  if (separator) {
    const decimals = text.length - text.lastIndexOf(separator) - 1;
    if (decimals === 1 || decimals === 2) {
      // Laatste teken is het decimaalteken.
      const whole = text.slice(0, text.lastIndexOf(separator)).replace(/[.,]/g, "");
      const fraction = text.slice(text.lastIndexOf(separator) + 1).padEnd(2, "0");
      normalized = `${whole}.${fraction}`;
    } else {
      // Alleen duizendtal-scheiding, bijv. "1.250".
      normalized = text.replace(/[.,]/g, "");
    }
  } else {
    normalized = text;
  }

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const cents = Math.round(amount * 100);
  if (cents > 100_000_000) return null;
  return cents;
}

/**
 * Prijzen uit schema.org / OpenGraph zijn machinaal en altijd met een punt als
 * decimaalteken ("1299.00"). Die mogen we niet als duizendtal-punt lezen.
 */
export function parseMachinePrice(
  input: string | number | null | undefined,
): number | null {
  if (input === null || input === undefined) return null;
  const text = String(input).trim();
  if (!text) return null;

  // "1299.00" of "1299,00" of "1299"
  const normalized = /^\d+,\d{1,2}$/.test(text)
    ? text.replace(",", ".")
    : text.replace(/,/g, "");

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}
