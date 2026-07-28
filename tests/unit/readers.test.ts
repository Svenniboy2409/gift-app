import { describe, expect, it } from "vitest";
import {
  extractFromHtml,
  parseJinaMarkdown,
  parseMicrolink,
  parseReaderText,
  gatherFrom,
  isComplete,
  mergeProduct,
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

describe("mergeProduct", () => {
  it("vult lege velden aan zonder bestaande te overschrijven", () => {
    // Precies het geval waar het om gaat: een winkel geeft alleen een naam,
    // het archief levert de prijs en de foto.
    const vanDeWinkel = {
      title: "Mattel Games Uno Liar",
      priceCents: null,
      imageUrl: null,
    };
    const uitHetArchief = {
      title: "Uno Liar kaartspel (oude titel)",
      priceCents: 1299,
      imageUrl: "https://media.s-bol.com/uno.jpg",
      description: "Kaartspel voor 2-6 spelers.",
    };

    const samen = mergeProduct(vanDeWinkel, uitHetArchief);
    expect(samen.title).toBe("Mattel Games Uno Liar");
    expect(samen.priceCents).toBe(1299);
    expect(samen.imageUrl).toBe("https://media.s-bol.com/uno.jpg");
    expect(samen.description).toBe("Kaartspel voor 2-6 spelers.");
  });

  it("behandelt een lege tekst als ontbrekend", () => {
    expect(mergeProduct({ title: "" }, { title: "Echte naam" }).title).toBe(
      "Echte naam",
    );
  });

  it("laat een prijs van 0 staan", () => {
    // 0 is een geldige prijs (gratis), geen ontbrekende waarde.
    expect(mergeProduct({ priceCents: 0 }, { priceCents: 999 }).priceCents).toBe(0);
  });

  it("verandert niets als de tweede bron niets toevoegt", () => {
    const basis = { title: "Sonos Era 100", priceCents: 24_900 };
    expect(mergeProduct(basis, {})).toEqual(basis);
  });
});

describe("isComplete", () => {
  it("vraagt om naam, prijs én foto", () => {
    expect(
      isComplete({ title: "X", priceCents: 100, imageUrl: "https://a/b.jpg" }),
    ).toBe(true);
    expect(isComplete({ title: "X", priceCents: 100 })).toBe(false);
    expect(isComplete({ title: "X", imageUrl: "https://a/b.jpg" })).toBe(false);
    expect(isComplete({ priceCents: 100, imageUrl: "https://a/b.jpg" })).toBe(false);
    expect(isComplete({})).toBe(false);
  });

  it("ziet een gratis product als compleet", () => {
    expect(
      isComplete({ title: "X", priceCents: 0, imageUrl: "https://a/b.jpg" }),
    ).toBe(true);
  });
});

describe("gatherFrom", () => {
  /** Een nagebootste leesdienst die na `delay` ms iets teruggeeft. */
  const reader = (
    source: string,
    product: Record<string, unknown> | null,
    delay = 0,
  ) =>
    () =>
      new Promise<{ product: Record<string, unknown>; source: string } | null>(
        (resolve) =>
          setTimeout(() => resolve(product ? { product, source } : null), delay),
      );

  it("plakt de vondsten van meerdere diensten aan elkaar", async () => {
    // Dit is het geval waar het om draait: de winkel geeft alleen een naam,
    // een andere bron de prijs, en weer een andere de foto.
    const result = await gatherFrom(
      [
        reader("winkel", { title: "Uno Liar" }),
        reader("dienst-b", { priceCents: 1299, currency: "EUR" }, 5),
        reader("dienst-c", { imageUrl: "https://media.s-bol.com/uno.jpg" }, 10),
      ],
      "https://www.bol.com/nl/nl/p/uno-liar/123/",
      {},
    );

    expect(result.product.title).toBe("Uno Liar");
    expect(result.product.priceCents).toBe(1299);
    expect(result.product.imageUrl).toBe("https://media.s-bol.com/uno.jpg");
    expect(result.sources).toEqual(["winkel", "dienst-b", "dienst-c"]);
  });

  it("vult aan op wat er al was", async () => {
    const result = await gatherFrom(
      [reader("archief", { priceCents: 1299, imageUrl: "https://a/b.jpg" })],
      "https://shop.nl/x",
      { title: "Al bekend" },
    );

    expect(result.product.title).toBe("Al bekend");
    expect(result.product.priceCents).toBe(1299);
  });

  it("noteert een dienst niet als hij niets nieuws toevoegt", async () => {
    const result = await gatherFrom(
      [reader("dubbelop", { title: "Al bekend" })],
      "https://shop.nl/x",
      { title: "Al bekend" },
    );
    expect(result.sources).toEqual([]);
  });

  it("stopt zodra alles binnen is en wacht niet op de trage dienst", async () => {
    const begin = Date.now();
    const result = await gatherFrom(
      [
        reader("snel", {
          title: "X",
          priceCents: 100,
          imageUrl: "https://a/b.jpg",
        }),
        reader("traag", { description: "komt te laat" }, 3000),
      ],
      "https://shop.nl/x",
      {},
    );

    expect(isComplete(result.product)).toBe(true);
    expect(Date.now() - begin).toBeLessThan(1000);
  });

  it("overleeft diensten die stukgaan of niets vinden", async () => {
    const kapot = () => Promise.reject(new Error("dienst plat"));
    const result = await gatherFrom(
      [kapot, reader("leeg", null), reader("goed", { title: "Toch iets" })],
      "https://shop.nl/x",
      {},
    );

    expect(result.product.title).toBe("Toch iets");
    expect(result.sources).toEqual(["goed"]);
  });
});
