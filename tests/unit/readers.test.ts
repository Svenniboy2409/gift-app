import { describe, expect, it } from "vitest";
import {
  extractFromHtml,
  parseJinaMarkdown,
  parseMicrolink,
} from "@/lib/scraper/readers";

describe("extractFromHtml", () => {
  it("neemt de winkelnaam van een controlepagina niet over als product", () => {
    // Amazon stuurt bij een botcontrole een 200 met deze pagina. Voorheen
    // belandde "Amazon.nl" hierdoor als productnaam in de lijst.
    const botcheck = `
      <html><head><title>Amazon.nl</title></head><body>
        <h1>Even geduld</h1>
        <p>Voer de tekens hieronder in.</p>
      </body></html>`;

    const product = extractFromHtml(botcheck, "https://www.amazon.nl/dp/B0BW1XDMQK");
    expect(product.title).toBeNull();
  });

  it("laat een echte productpagina ongemoeid", () => {
    const pagina = `
      <html><head>
        <meta property="og:title" content="Sonos Era 100 draadloze speaker">
        <meta property="product:price:amount" content="249.00">
      </head><body></body></html>`;

    const product = extractFromHtml(pagina, "https://www.amazon.nl/dp/B0BW1XDMQK");
    expect(product.title).toBe("Sonos Era 100 draadloze speaker");
    expect(product.priceCents).toBe(24_900);
  });
});

describe("parseJinaMarkdown", () => {
  const antwoord = `Title: Sonos Era 100 draadloze speaker - zwart

URL Source: https://www.amazon.nl/dp/B0BW1XDMQK

Markdown Content:
![logo](https://m.media-amazon.com/images/G/logo._CB1.png)
![Sonos Era 100](https://m.media-amazon.com/images/I/71abcdef._AC_SL1500_.jpg)

Sonos Era 100 draadloze speaker

€ 249,00

Gratis bezorging`;

  it("haalt titel, foto en prijs uit het antwoord", () => {
    const product = parseJinaMarkdown(antwoord, "https://www.amazon.nl/dp/B0BW1XDMQK");
    expect(product.title).toBe("Sonos Era 100 draadloze speaker - zwart");
    expect(product.imageUrl).toBe(
      "https://m.media-amazon.com/images/I/71abcdef._AC_SL1500_.jpg",
    );
    expect(product.priceCents).toBe(24_900);
    expect(product.currency).toBe("EUR");
  });

  it("slaat logo's over bij het kiezen van een foto", () => {
    const product = parseJinaMarkdown(antwoord, "https://www.amazon.nl/dp/X");
    expect(product.imageUrl).not.toContain("logo");
  });

  it("weigert een titel die alleen de winkelnaam is", () => {
    const botcheck = "Title: Amazon.nl\n\nMarkdown Content:\nEven geduld";
    const product = parseJinaMarkdown(botcheck, "https://www.amazon.nl/dp/X");
    expect(product.title).toBeNull();
  });

  it("geeft lege velden bij een antwoord zonder titel", () => {
    const product = parseJinaMarkdown("Onzin zonder kopregels", "https://shop.nl/x");
    expect(product.title).toBeNull();
    expect(product.priceCents).toBeNull();
  });
});

describe("parseMicrolink", () => {
  it("leest het JSON-antwoord uit", () => {
    const body = JSON.stringify({
      status: "success",
      data: {
        title: "LEGO Classic Creatieve Superset 11036",
        description: "1600 stenen in 33 kleuren.",
        image: { url: "https://media.s-bol.com/lego.jpg" },
      },
    });
    const product = parseMicrolink(body, "https://www.bol.com/nl/nl/p/x/123/");
    expect(product.title).toBe("LEGO Classic Creatieve Superset 11036");
    expect(product.description).toBe("1600 stenen in 33 kleuren.");
    expect(product.imageUrl).toBe("https://media.s-bol.com/lego.jpg");
  });

  it("accepteert een afbeelding die als losse tekst komt", () => {
    const body = JSON.stringify({
      status: "success",
      data: { title: "Houten puzzel", image: "https://shop.nl/puzzel.jpg" },
    });
    expect(parseMicrolink(body, "https://shop.nl/x").imageUrl).toBe(
      "https://shop.nl/puzzel.jpg",
    );
  });

  it("weigert de winkelnaam als titel", () => {
    const body = JSON.stringify({
      status: "success",
      data: { title: "bol.com" },
    });
    expect(parseMicrolink(body, "https://www.bol.com/nl/nl/p/x/1/").title).toBeNull();
  });

  it("crasht niet op een fout of kapot antwoord", () => {
    expect(parseMicrolink("geen json", "https://shop.nl/x")).toEqual({});
    expect(
      parseMicrolink(JSON.stringify({ status: "fail" }), "https://shop.nl/x"),
    ).toEqual({});
    expect(parseMicrolink("{}", "https://shop.nl/x")).toEqual({});
  });
});
