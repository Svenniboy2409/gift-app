/**
 * Herkent "titels" die geen productnaam zijn.
 *
 * Webshops sturen bij een botcontrole vaak gewoon een 200 terug met een
 * controlepagina. De <title> daarvan is dan de winkelnaam zelf ("Amazon.nl") of
 * een foutmelding ("Robot Check", "Even geduld"). Zonder deze controle belandt
 * zoiets als productnaam in de lijst.
 */

const JUNK_PATTERNS = [
  /^robot\s*check$/i,
  /captcha/i,
  /^even geduld/i,
  /^een moment/i,
  /^just a moment/i,
  /^attention required/i,
  /access denied/i,
  /toegang geweigerd/i,
  /are you (a )?human/i,
  /bot detect/i,
  /sorry[!,.]? (something|iets)/i,
  // bol.com's foutpagina heet "Oeps! Er ging iets mis".
  /^oeps\b/i,
  /er ging iets mis/i,
  /something went wrong/i,
  /er is iets misgegaan/i,
  /probeer het (later )?(nog eens|opnieuw)/i,
  /^(page|pagina) niet gevonden/i,
  /^(404|403|429|503)\b/,
  /not found/i,
  /forbidden/i,
  /service unavailable/i,
  // Foutpagina's van de leesdiensten zelf. r.jina.ai geeft bijvoorbeeld
  // "IP address 34.96.49.86 is blocked" terug als bol.com hén weert.
  /\bip address\b/i,
  /\bis blocked\b/i,
  /\bgeblokkeerd\b/i,
  /rate.?limit/i,
  /too many requests/i,
  /temporarily unavailable/i,
  /tijdelijk niet beschikbaar/i,
  /^error\b/i,
  /^fout\b/i,
  /security check/i,
  /verifieer/i,
  /verify you are/i,
  /enable javascript/i,
  /javascript (is )?(required|uitgeschakeld)/i,
  /cookies? (accepteren|toestaan)/i,
];

/** "www.amazon.nl" → ["amazon.nl", "amazon"] */
function hostVariants(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const label = host.split(".")[0];
  return new Set([host, label]);
}

/**
 * Is dit een bruikbare productnaam? `hostname` van de pagina wordt gebruikt om
 * te zien of de titel niet gewoon de winkelnaam is.
 */
export function looksLikeJunkTitle(
  title: string | null | undefined,
  hostname?: string,
): boolean {
  if (!title) return true;

  const text = title.replace(/\s+/g, " ").trim();
  if (text.length < 4) return true;

  if (JUNK_PATTERNS.some((pattern) => pattern.test(text))) return true;

  if (hostname) {
    const normalized = text.toLowerCase().replace(/\s+/g, "");
    for (const variant of hostVariants(hostname)) {
      // Exact de winkelnaam, met of zonder domeinextensie: geen product.
      if (normalized === variant) return true;
      if (normalized === variant.split(".")[0]) return true;
      if (normalized === `www.${variant}`) return true;
    }
  }

  // Een titel zonder enige letter (alleen cijfers of leestekens) zegt niets.
  if (!/\p{L}/u.test(text)) return true;

  return false;
}

/**
 * Afbeeldingen die bij een fout- of controlepagina horen in plaats van bij een
 * product. bol.com serveert bijvoorbeeld een illustratie met "Oeps" erop; zonder
 * deze controle belandt die als productfoto in je lijst.
 */
const JUNK_IMAGE_PATTERNS = [
  /\boeps\b/i,
  /\boops\b/i,
  /\berror\b/i,
  /\bfout(melding)?\b/i,
  /\b404\b/i,
  /not[-_]?found/i,
  /placeholder/i,
  /no[-_]?image/i,
  /geen[-_]?afbeelding/i,
  /default[-_](image|thumb)/i,
  /coming[-_]?soon/i,
  /\bsprite\b/i,
  /\blogo\b/i,
  /\bfavicon\b/i,
  /\bicon\b/i,
];

/** Is dit een productfoto, of het plaatje van een foutpagina? */
export function looksLikeJunkImage(url: string | null | undefined): boolean {
  if (!url) return true;
  if (!/^https?:\/\//i.test(url)) return true;
  return JUNK_IMAGE_PATTERNS.some((pattern) => pattern.test(url));
}

/** Geeft de titel terug, of null als het rommel is. */
export function cleanTitle(
  title: string | null | undefined,
  hostname?: string,
): string | null {
  return looksLikeJunkTitle(title, hostname) ? null : title!.trim();
}
