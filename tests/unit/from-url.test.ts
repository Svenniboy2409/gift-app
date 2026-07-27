import { describe, expect, it } from "vitest";
import { amazonAsin, hintsFromUrl } from "@/lib/scraper/from-url";

describe("hintsFromUrl", () => {
  it("haalt de productnaam uit een bol.com-link", () => {
    const hints = hintsFromUrl(
      "https://www.bol.com/nl/nl/p/lego-classic-creatieve-superset-11036/9300000167827927/",
    );
    expect(hints.title).toBe("Lego classic creatieve superset 11036");
    expect(hints.merchant).toBe("bol");
  });

  it("haalt naam én foto uit een Amazon-link", () => {
    const hints = hintsFromUrl(
      "https://www.amazon.nl/Sonos-Era-100-draadloze-speaker/dp/B0BW1XDMQK/ref=sr_1_3",
    );
    expect(hints.title).toBe("Sonos Era 100 draadloze speaker");
    expect(hints.imageUrl).toContain("B0BW1XDMQK");
    expect(hints.merchant).toBe("Amazon");
  });

  it("kent de Coolblue-vorm", () => {
    const hints = hintsFromUrl(
      "https://www.coolblue.nl/product/941216/sonos-era-100-zwart.html",
    );
    expect(hints.title).toBe("Sonos era 100 zwart");
    expect(hints.merchant).toBe("Coolblue");
  });

  it("werkt ook op een willekeurige webshop", () => {
    const hints = hintsFromUrl(
      "https://www.voorbeeldshop.nl/artikel/blauwe-wollen-trui-maat-m",
    );
    expect(hints.title).toBe("Blauwe wollen trui maat m");
    expect(hints.merchant).toBe("Voorbeeldshop");
  });

  it("decodeert tekens uit de link", () => {
    const hints = hintsFromUrl("https://shop.nl/p/caf%C3%A9-glazen-set");
    expect(hints.title).toBe("Café glazen set");
  });

  it("geeft geen titel als er alleen ID's in de link staan", () => {
    expect(hintsFromUrl("https://shop.nl/p/9300000167827927/").title).toBeNull();
    expect(hintsFromUrl("https://shop.nl/").title).toBeNull();
  });

  it("negeert te korte segmenten, maar accepteert losse woorden", () => {
    // Te kort om een productnaam te zijn.
    expect(hintsFromUrl("https://shop.nl/p/abc").title).toBeNull();
    // Wel lang genoeg. Liever een ruwe naam die de gebruiker aanpast dan niets.
    expect(hintsFromUrl("https://shop.nl/tafellamp").title).toBe("Tafellamp");
  });

  it("crasht niet op onzin", () => {
    expect(hintsFromUrl("dit is geen url")).toEqual({
      title: null,
      imageUrl: null,
      merchant: null,
    });
  });

  it("bouwt alleen voor Amazon een foto-URL", () => {
    expect(
      hintsFromUrl("https://www.bol.com/nl/nl/p/iets/9300000167827927/").imageUrl,
    ).toBeNull();
  });
});

describe("amazonAsin", () => {
  it("herkent de gangbare Amazon-linkvormen", () => {
    const vormen = [
      "https://www.amazon.nl/Sonos-Era-100/dp/B0BW1XDMQK/",
      "https://www.amazon.nl/dp/B0BW1XDMQK",
      "https://www.amazon.nl/gp/product/B0BW1XDMQK?th=1",
      "https://www.amazon.de/gp/aw/d/B0BW1XDMQK",
      "https://www.amazon.com/dp/b0bw1xdmqk",
    ];
    for (const vorm of vormen) {
      expect(amazonAsin(new URL(vorm))).toBe("B0BW1XDMQK");
    }
  });

  it("geeft null voor niet-Amazon en voor Amazon zonder product", () => {
    expect(amazonAsin(new URL("https://www.bol.com/dp/B0BW1XDMQK"))).toBeNull();
    expect(amazonAsin(new URL("https://www.amazon.nl/s?k=speaker"))).toBeNull();
  });
});
