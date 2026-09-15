/**
 * Dezelfde winkel, een andere voordeur.
 *
 * Sommige webshops weren geautomatiseerd verkeer alleen bij hun Nederlandse
 * winkel. Bij bol.com is dat sinds voorjaar 2026 hardnekkig: de Nederlandse
 * productpagina antwoordt vrijwel altijd met 403, ook vanaf een gewone
 * thuisverbinding. De Belgische winkel draait op dezelfde catalogus, met
 * dezelfde product-id's, en is minder afgeschermd.
 *
 * Dat is geen omweg om een blokkade te omzeilen maar een andere openbare
 * pagina van dezelfde winkel, en we proberen hem pas als de gewone weg dicht
 * zit. Eén ding moet de gebruiker wel weten: prijzen kunnen per land
 * verschillen. De scan-route zegt er daarom bij waar de gegevens vandaan komen.
 */

export type Mirror = {
  /** Het adres om in plaats daarvan te proberen. */
  url: string;
  /**
   * Hoort de pagina die we terugkregen nog bij hetzelfde product? Winkels
   * sturen een onbekend adres graag door naar hun voorpagina, en die mag nooit
   * als product in een lijst belanden.
   */
  belongsToSameProduct: (finalUrl: string) => boolean;
};

/** De product-id achteraan een bol.com-link: /p/<slug>/9300000130744527/ */
function bolProductId(pathname: string) {
  const match = /\/p\/[^/]*\/(\d{6,})\/?$/.exec(pathname);
  return match ? match[1] : null;
}

export function mirrorFor(rawUrl: string): Mirror | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "bol.com") return null;

  // Alleen de vorm die bol vandaag gebruikt: /nl/nl/p/<slug>/<id>/. Bij iets
  // anders gokken we liever niet.
  if (!url.pathname.startsWith("/nl/nl/")) return null;

  const id = bolProductId(url.pathname);
  if (!id) return null;

  const mirror = new URL(url.toString());
  mirror.pathname = url.pathname.replace(/^\/nl\/nl\//, "/be/nl/");

  return {
    url: mirror.toString(),
    belongsToSameProduct: (finalUrl) => finalUrl.includes(id),
  };
}
