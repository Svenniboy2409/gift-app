import { describe, expect, it } from "vitest";
import {
  extractFromHtml,
  parseJinaMarkdown,
  parseMicrolink,
  parseReaderText,
  waybackSnapshotUrl,
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

describe("parseReaderText", () => {
  it("gebruikt de volledige extractie als de dienst HTML teruggeeft", () => {
    // Dit is de winst van HTML boven platte tekst: we krijgen ook de prijs mee.
    const html = `
      <!doctype html><html><head>
        <script type="application/ld+json">
        {"@type":"Product","name":"HEMA badjas wafel wit",
         "image":"https://cdn.hema.nl/badjas.jpg",
         "offers":{"@type":"Offer","price":"29.50","priceCurrency":"EUR"}}
        </script>
      </head><body></body></html>`;

    const product = parseReaderText(html, "https://www.hema.nl/p/badjas");
    expect(product.title).toBe("HEMA badjas wafel wit");
    expect(product.priceCents).toBe(2950);
    expect(product.imageUrl).toBe("https://cdn.hema.nl/badjas.jpg");
  });

  it("valt terug op de tekstvorm als er geen HTML komt", () => {
    const tekst = "Title: Houten puzzel 500 stukjes\n\nMarkdown Content:\n€ 12,99";
    const product = parseReaderText(tekst, "https://shop.nl/p/puzzel");
    expect(product.title).toBe("Houten puzzel 500 stukjes");
    expect(product.priceCents).toBe(1299);
  });

  it("weigert de foutpagina van een leesdienst", () => {
    // Precies wat r.jina.ai teruggaf toen bol.com hén blokkeerde.
    const tekst = "Title: IP address 34.96.49.86 is blocked\n\nMarkdown Content:\n";
    const product = parseReaderText(tekst, "https://www.bol.com/nl/nl/p/x/123/");
    expect(product.title).toBeNull();
  });
});

describe("waybackSnapshotUrl", () => {
  it("maakt van een momentopname een onbewerkte URL", () => {
    const body = JSON.stringify({
      archived_snapshots: {
        closest: {
          available: true,
          url: "http://web.archive.org/web/20250412093000/https://www.bol.com/nl/nl/p/x/123/",
        },
      },
    });
    // "id_" haalt de navigatiebalk van het archief weg, https voorkomt een
    // onnodige omleiding.
    expect(waybackSnapshotUrl(body)).toBe(
      "https://web.archive.org/web/20250412093000id_/https://www.bol.com/nl/nl/p/x/123/",
    );
  });

  it("geeft null als er geen kopie is", () => {
    expect(waybackSnapshotUrl(JSON.stringify({ archived_snapshots: {} }))).toBeNull();
    expect(
      waybackSnapshotUrl(
        JSON.stringify({ archived_snapshots: { closest: { available: false } } }),
      ),
    ).toBeNull();
  });

  it("crasht niet op een kapot antwoord", () => {
    expect(waybackSnapshotUrl("geen json")).toBeNull();
    expect(waybackSnapshotUrl("{}")).toBeNull();
  });
});
