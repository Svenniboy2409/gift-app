import "server-only";

import type { ExtractedProduct } from "@/lib/scraper/extract";
import { mirrorFor } from "@/lib/scraper/mirrors";
import { extractFromHtml } from "@/lib/scraper/readers";
import { FetchBlockedError, fetchHtml } from "@/lib/scraper/safe-fetch";

export type PageAttempt = {
  product: Partial<ExtractedProduct>;
  /** Het adres dat we bewaren; altijd de winkel die de gebruiker koos. */
  finalUrl: string;
  /** Wat er onderweg opviel, voor de melding boven het formulier. */
  reason?: string;
  /** Een fout die de aanvraag meteen moet afbreken (SSRF-bescherming). */
  fatal?: "private-address" | "invalid-protocol";
};

/**
 * De pagina zelf ophalen, met één omweg als de voordeur dichtzit.
 *
 * Grote webshops weren verkeer vanaf datacenters, en daar draait deze app op.
 * Bij bol.com is dat sinds voorjaar 2026 zo hardnekkig dat de Nederlandse
 * productpagina vrijwel altijd 403 antwoordt. Dezelfde catalogus staat ook in
 * hun Belgische winkel, en die is wél te lezen — dus dat is het proberen waard
 * voordat we de leesdiensten en de link zelf aanspreken.
 */
export async function fetchProductPage(url: string): Promise<PageAttempt> {
  let product: Partial<ExtractedProduct> = {};
  let finalUrl = url;
  let reason: string | undefined;

  try {
    const page = await fetchHtml(url);
    finalUrl = page.finalUrl;
    if (page.html) {
      product = extractFromHtml(page.html, page.finalUrl);
    } else if (page.status === 403 || page.status === 429) {
      reason = "blocked";
    } else {
      reason = "fetch-failed";
    }
  } catch (error) {
    const failure =
      error instanceof FetchBlockedError ? error.message : "fetch-failed";
    if (failure === "private-address" || failure === "invalid-protocol") {
      return { product, finalUrl, fatal: failure };
    }
    reason = failure;
  }

  // De omweg is ook het proberen waard als de pagina wél binnenkwam maar niets
  // opleverde: webshops sturen bij een botcontrole vaak gewoon een 200 met een
  // controlepagina, en daar houdt extractFromHtml niets aan over.
  const niksGevonden = !product.title;
  if (reason !== "blocked" && !(niksGevonden && reason === undefined)) {
    return { product, finalUrl, reason };
  }

  const mirror = mirrorFor(url);
  if (!mirror) return { product, finalUrl, reason };

  try {
    const other = await fetchHtml(mirror.url);
    // Een onbekend adres stuurt een winkel graag door naar de voorpagina. Die
    // mag nooit als product in een lijst belanden, dus we eisen dat we
    // hetzelfde product terugkregen.
    if (other.html && mirror.belongsToSameProduct(other.finalUrl)) {
      const found = extractFromHtml(other.html, other.finalUrl);
      if (found.title) {
        // De link van de gebruiker blijft staan; alleen de gegevens komen uit
        // de andere winkel. Dat zegt de app erbij, want prijzen kunnen per
        // land verschillen.
        return { product: found, finalUrl, reason: "other-store" };
      }
    }
  } catch {
    // Ook die deur zit dicht; de leesdiensten zijn er nog.
  }

  return { product, finalUrl, reason };
}
