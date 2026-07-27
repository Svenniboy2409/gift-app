import { merchantFromHost } from "@/lib/scraper/sites";

/**
 * Wat we uit de link zelf kunnen afleiden, zónder de pagina op te halen.
 *
 * Grote webshops als bol.com en Amazon weren geautomatiseerde verzoeken vanaf
 * datacenters — en daar draait deze app op. Dan krijgen we de pagina simpelweg
 * niet te zien. Maar in de link zit vaak al meer dan genoeg: de productnaam
 * staat er meestal letterlijk in, en bij Amazon kunnen we uit de ASIN zelfs de
 * productfoto opbouwen. Zo hoeft de gebruiker hooguit de prijs nog in te vullen
 * in plaats van alles.
 */
export type UrlHints = {
  title: string | null;
  imageUrl: string | null;
  merchant: string | null;
};

/** "lego-classic-superset-11036" → "Lego classic superset 11036" */
function humanize(slug: string) {
  // Eerst decoderen: %C3%A9 is één teken (é) verspreid over twee bytes, dus
  // per losse %XX vertalen levert onzin op.
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Ongeldige codering; dan werken we met de ruwe tekst verder.
  }

  const text = decoded
    .replace(/\.(html?|php|aspx?)$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;
  // Slugs zijn vaak volledig kleingeschreven; alleen de eerste letter aanzetten
  // laat bestaande hoofdletters (zoals bij Amazon) met rust.
  return (text.charAt(0).toUpperCase() + text.slice(1)).slice(0, 160);
}

/** Segmenten die nooit de productnaam zijn. */
const NOISE = new Set([
  "p",
  "dp",
  "gp",
  "product",
  "products",
  "nl",
  "be",
  "en",
  "de",
  "shop",
  "artikel",
  "item",
  "ref",
]);

function looksLikeId(segment: string) {
  // Puur cijfers, of een productcode als B0BW1XDMQK / 9300000167827927.
  return /^\d+$/.test(segment) || /^[A-Z0-9]{10}$/.test(segment);
}

/** De ASIN van een Amazon-product, als die in de link staat. */
export function amazonAsin(url: URL) {
  if (!/(^|\.)amazon\./i.test(url.hostname)) return null;
  const match =
    /\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?:[/?]|$)/i.exec(
      url.pathname,
    );
  return match ? match[1].toUpperCase() : null;
}

/**
 * De productnaam uit het pad. We pakken het langste segment dat geen ID en
 * geen ruis is — dat is vrijwel altijd de slug met de productnaam.
 */
function titleFromPath(url: URL) {
  const segments = url.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !NOISE.has(segment.toLowerCase()))
    .filter((segment) => !looksLikeId(segment));

  if (segments.length === 0) return null;

  const best = segments.reduce((longest, segment) =>
    segment.length > longest.length ? segment : longest,
  );

  // Te kort of zonder letters is geen productnaam. Verder zijn we ruimhartig:
  // de gebruiker ziet het resultaat in een invulveld en past het toch aan, dus
  // een net iets te ruwe naam is beter dan een leeg veld.
  if (best.length < 6 || !/[a-z]/i.test(best)) return null;
  return humanize(best);
}

export function hintsFromUrl(rawUrl: string): UrlHints {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { title: null, imageUrl: null, merchant: null };
  }

  const asin = amazonAsin(url);

  return {
    title: titleFromPath(url),
    // De afbeeldings-CDN van Amazon is een gewone bestandsserver zonder
    // botcontrole, dus die kunnen we wél bereiken.
    imageUrl: asin
      ? `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`
      : null,
    merchant: url.hostname ? merchantFromHost(url.hostname) : null,
  };
}
