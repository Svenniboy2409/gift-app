/**
 * Welke prijs hoort er bij dit product?
 *
 * Een productpagina bevat vaak meerdere aanbiedingen: de winkel zelf, andere
 * verkopers, en tweedehands exemplaren. Blind de eerste pakken levert dan de
 * prijs van een wildvreemde aanbieder op — precies het soort "heel andere
 * prijs" dat een verlanglijst onbruikbaar maakt. Daarom kiezen we bewust:
 * nieuw gaat voor gebruikt, op voorraad gaat voor uitverkocht, en pas daarna
 * telt de volgorde waarin de winkel ze heeft opgeschreven.
 */

export type OfferLike = Record<string, unknown>;

/** Tweedehands, refurbished, beschadigde verpakking: niet de vraagprijs. */
const SECOND_HAND = /used|refurb|damaged|open[-_\s]?box|tweedehands/i;
const OUT_OF_STOCK = /outofstock|soldout|discontinued/i;

function asText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = asText(item);
      if (found) return found;
    }
  }
  return null;
}

function asObjects(value: unknown): OfferLike[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => asObjects(item));
  }
  return typeof value === "object" ? [value as OfferLike] : [];
}

/**
 * Aanbiedingen uitpakken. Een AggregateOffer is een omslag om losse
 * aanbiedingen heen; die vouwen we open, zodat we ook daarbinnen kunnen kiezen.
 */
export function flattenOffers(node: OfferLike | undefined | null): OfferLike[] {
  const out: OfferLike[] = [];
  const visit = (offer: OfferLike) => {
    const nested = asObjects(offer.offers);
    if (nested.length > 0) {
      nested.forEach(visit);
      // De omslag zelf blijft bruikbaar: hij heeft vaak een lowPrice.
    }
    out.push(offer);
  };
  asObjects(node?.offers).forEach(visit);
  return out;
}

/** De prijs binnen één aanbieding, waar hij ook staat. */
export function priceOf(offer: OfferLike): string | null {
  const direct = asText(offer.price);
  if (direct) return direct;

  for (const spec of asObjects(offer.priceSpecification)) {
    const value = asText(spec.price) ?? asText(spec.minPrice);
    if (value) return value;
  }

  return asText(offer.lowPrice);
}

function currencyOf(offer: OfferLike): string | null {
  const direct = asText(offer.priceCurrency);
  if (direct) return direct;
  for (const spec of asObjects(offer.priceSpecification)) {
    const value = asText(spec.priceCurrency);
    if (value) return value;
  }
  return null;
}

function isSecondHand(offer: OfferLike) {
  const condition = asText(offer.itemCondition) ?? "";
  return SECOND_HAND.test(condition);
}

function isOutOfStock(offer: OfferLike) {
  const availability = asText(offer.availability) ?? "";
  return OUT_OF_STOCK.test(availability.replace(/[\s_-]/g, ""));
}

export type ChosenOffer = { price: string; currency: string | null };

/**
 * De aanbieding waarvan de prijs op de pagina staat. Geeft `null` als er geen
 * enkele aanbieding een prijs heeft.
 */
export function chooseOffer(node: OfferLike | undefined | null): ChosenOffer | null {
  const offers = flattenOffers(node).filter((offer) => priceOf(offer) !== null);
  if (offers.length === 0) return null;

  // Tweedehands valt af zolang er iets nieuws tussen staat; staat er niets
  // anders, dan is dat blijkbaar wat de winkel verkoopt.
  const nieuw = offers.filter((offer) => !isSecondHand(offer));
  const bruikbaar = nieuw.length > 0 ? nieuw : offers;

  const opVoorraad = bruikbaar.filter((offer) => !isOutOfStock(offer));
  const gekozen = (opVoorraad.length > 0 ? opVoorraad : bruikbaar)[0];

  const price = priceOf(gekozen);
  if (price === null) return null;
  return { price, currency: currencyOf(gekozen) };
}
