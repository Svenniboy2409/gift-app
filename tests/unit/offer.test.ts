import { describe, expect, it } from "vitest";
import { chooseOffer, priceOf } from "@/lib/scraper/offer";

/**
 * Eén product, meerdere aanbiedingen. Welke prijs staat er op de pagina?
 */
describe("chooseOffer", () => {
  it("slaat een tweedehands aanbieding over", () => {
    const product = {
      offers: [
        { price: "12.50", itemCondition: "https://schema.org/UsedCondition" },
        { price: "29.99", itemCondition: "https://schema.org/NewCondition" },
      ],
    };
    expect(chooseOffer(product)?.price).toBe("29.99");
  });

  it("neemt de tweedehands prijs wél als er niets anders is", () => {
    const product = {
      offers: [{ price: "12.50", itemCondition: "https://schema.org/UsedCondition" }],
    };
    expect(chooseOffer(product)?.price).toBe("12.50");
  });

  it("gaat voorbij aan wat uitverkocht is", () => {
    const product = {
      offers: [
        { price: "10.00", availability: "https://schema.org/OutOfStock" },
        { price: "14.00", availability: "https://schema.org/InStock" },
      ],
    };
    expect(chooseOffer(product)?.price).toBe("14.00");
  });

  it("leest de prijs uit een priceSpecification", () => {
    const product = {
      offers: {
        priceCurrency: "EUR",
        priceSpecification: { "@type": "UnitPriceSpecification", price: "249.95" },
      },
    };
    expect(chooseOffer(product)).toEqual({ price: "249.95", currency: "EUR" });
  });

  it("vouwt een AggregateOffer open en kiest de aanbieding erbinnen", () => {
    const product = {
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "19.95",
        highPrice: "24.95",
        priceCurrency: "EUR",
        offers: [{ price: "22.50", priceCurrency: "EUR" }],
      },
    };
    expect(chooseOffer(product)?.price).toBe("22.50");
  });

  it("valt terug op lowPrice als een AggregateOffer verder leeg is", () => {
    const product = {
      offers: { "@type": "AggregateOffer", lowPrice: "19.95", priceCurrency: "EUR" },
    };
    expect(chooseOffer(product)).toEqual({ price: "19.95", currency: "EUR" });
  });

  it("geeft niets terug als geen enkele aanbieding een prijs heeft", () => {
    expect(chooseOffer({ offers: [{ availability: "InStock" }] })).toBeNull();
    expect(chooseOffer({})).toBeNull();
    expect(chooseOffer(null)).toBeNull();
  });

  it("negeert een prijs die geen tekst of getal is", () => {
    expect(priceOf({ price: { waarde: 12 } })).toBeNull();
    expect(priceOf({ price: 12.5 })).toBe("12.5");
  });
});
