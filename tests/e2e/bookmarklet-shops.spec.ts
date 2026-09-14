import { expect, test, type Page } from "@playwright/test";
import { buildBookmarklet } from "../../lib/bookmarklet";

/**
 * Pagina's zoals echte webshops ze serveren, met de valkuilen erin die de
 * bewaarknop eerder de verkeerde naam of prijs opleverden: aanbevelingen in de
 * productgegevens, tweedehands aanbiedingen, een prijs die alleen zichtbaar op
 * de pagina staat.
 */

type Geval = {
  url: string;
  html: string;
  titel: string;
  cents: number | null;
};

const GEVALLEN: Record<string, Geval> = {
  "tweedehands aanbieding staat vooraan": {
    url: "https://www.bol.com/nl/nl/p/lego-classic/9300000130744527/",
    titel: "LEGO Classic Creatieve vrolijke bakstenen",
    cents: 2999,
    html: `<!doctype html><html><head>
<title>LEGO Classic Creatieve vrolijke bakstenen 11035 | bol.com</title>
<meta property="og:site_name" content="bol.com">
<meta property="og:title" content="LEGO Classic Creatieve vrolijke bakstenen 11035 | bol.com">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product",
 "name":"LEGO Classic Creatieve vrolijke bakstenen",
 "offers":[
  {"@type":"Offer","price":"12.50","priceCurrency":"EUR","itemCondition":"https://schema.org/UsedCondition"},
  {"@type":"Offer","price":"29.99","priceCurrency":"EUR","itemCondition":"https://schema.org/NewCondition","availability":"https://schema.org/InStock"}
 ]}
</script></head><body><h1>LEGO Classic Creatieve vrolijke bakstenen</h1></body></html>`,
  },

  "aanbevelingen staan vóór het product": {
    url: "https://www.voorbeeldshop.nl/p/koffiemachine",
    titel: "De'Longhi Magnifica S espressomachine",
    cents: 34900,
    html: `<!doctype html><html><head>
<title>De'Longhi Magnifica S espressomachine - Voorbeeldshop</title>
<meta property="og:site_name" content="Voorbeeldshop">
<meta property="og:title" content="De'Longhi Magnifica S espressomachine">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ItemList","itemListElement":[
 {"@type":"ListItem","position":1,"item":{"@type":"Product","name":"Senseo Original koffiepadmachine","offers":{"@type":"Offer","price":"59.00","priceCurrency":"EUR"}}}
]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product",
 "name":"De'Longhi Magnifica S espressomachine",
 "offers":{"@type":"Offer","price":"349.00","priceCurrency":"EUR"}}
</script></head><body><h1>De'Longhi Magnifica S espressomachine</h1></body></html>`,
  },

  "prijs staat alleen in de priceSpecification": {
    url: "https://www.voorbeeldshop.nl/p/wandelschoenen",
    titel: "Meindl Vakuum GTX wandelschoenen",
    cents: 24995,
    html: `<!doctype html><html><head>
<title>Meindl Vakuum GTX wandelschoenen</title>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product",
 "name":"Meindl Vakuum GTX wandelschoenen",
 "offers":{"@type":"Offer","priceCurrency":"EUR",
  "priceSpecification":{"@type":"UnitPriceSpecification","price":"249.95","priceCurrency":"EUR"}}}
</script></head><body><h1>Meindl Vakuum GTX wandelschoenen</h1></body></html>`,
  },

  "een besproken product staat vóór het echte": {
    url: "https://www.voorbeeldshop.nl/p/fondueset",
    titel: "Boska Fonduepan Copenhagen",
    cents: 6495,
    html: `<!doctype html><html><head>
<title>Boska Fonduepan Copenhagen</title>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Review",
 "itemReviewed":{"@type":"Product","name":"Vorige aankoop: Raclette-grill","offers":{"@type":"Offer","price":"89.00","priceCurrency":"EUR"}}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product",
 "name":"Boska Fonduepan Copenhagen",
 "offers":{"@type":"Offer","price":"64.95","priceCurrency":"EUR"}}
</script></head><body><h1>Boska Fonduepan Copenhagen</h1></body></html>`,
  },

  "geen productgegevens, prijs staat in beeld": {
    url: "https://www.amazon.nl/dp/B0GJ6QLXS1",
    titel: "TAF Talking Flower",
    cents: 2895,
    html: `<!doctype html><html><head>
<title>TAF Talking Flower : Amazon.nl: Games</title>
<meta property="og:site_name" content="Amazon.nl">
</head><body>
<h1 id="title">TAF Talking Flower</h1>
<span class="a-price"><span class="a-offscreen">€28,95</span></span>
</body></html>`,
  },

  "oude prijs doorgestreept naast de nieuwe": {
    url: "https://www.hema.nl/p/tompouce",
    titel: "Luxe tompouce vlaai 10 personen",
    cents: 1799,
    html: `<!doctype html><html><head>
<title>Luxe tompouce vlaai 10 personen - HEMA</title>
<meta property="og:site_name" content="HEMA">
</head><body><h1>Luxe tompouce vlaai 10 personen</h1>
<del class="price-old">€ 24,99</del>
<p class="price">€ 17,99</p></body></html>`,
  },

  "alleen een paginatitel met winkelnaam erachter": {
    url: "https://www.voorbeeldshop.nl/p/theepot",
    titel: "Gietijzeren theepot 1,2 liter",
    cents: null,
    html: `<!doctype html><html><head>
<title>Gietijzeren theepot 1,2 liter | Voorbeeldshop</title>
<meta property="og:site_name" content="Voorbeeldshop">
</head><body><p>Geen kop, geen gegevens.</p></body></html>`,
  },

  "centen als superscript naast de euro's": {
    url: "https://www.bol.com/nl/nl/p/lego-duplo/9300000098765432/",
    titel: "LEGO Duplo Grote Dierentuin",
    cents: 4999,
    html: `<!doctype html><html><head>
<title>LEGO Duplo Grote Dierentuin | bol.com</title>
<meta property="og:site_name" content="bol.com">
</head><body>
<h1 data-test="title">LEGO Duplo Grote Dierentuin</h1>
<span data-test="price">49<sup class="promo-price__fraction">99</sup></span>
</body></html>`,
  },

  "de winkelprijs wint van een verouderde prijs in de gegevens": {
    url: "https://www.bol.com/nl/nl/p/koptelefoon/9300000011111111/",
    titel: "Sony WH-1000XM5 koptelefoon",
    cents: 27900,
    html: `<!doctype html><html><head>
<title>Sony WH-1000XM5 koptelefoon | bol.com</title>
<meta property="og:site_name" content="bol.com">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Sony WH-1000XM5 koptelefoon",
 "offers":{"@type":"Offer","price":"419.00","priceCurrency":"EUR"}}
</script>
</head><body>
<h1 data-test="title">Sony WH-1000XM5 koptelefoon</h1>
<span data-test="price">€ 279,00</span>
</body></html>`,
  },
};

async function leesUit(page: Page, geval: Geval, baseURL: string) {
  await page.route(geval.url, (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: geval.html }),
  );
  await page.goto(geval.url);

  const target = await page.evaluate((code) => {
    const source = decodeURIComponent(code.replace(/^javascript:/, ""));
    let opened = "";
    (window as unknown as { open: (u: string) => null }).open = (u: string) => {
      opened = u;
      return null;
    };
    eval(source);
    return opened;
  }, buildBookmarklet(baseURL));

  return new URL(target).searchParams;
}

for (const [naam, geval] of Object.entries(GEVALLEN)) {
  test(`bewaarknop: ${naam}`, async ({ page, baseURL }) => {
    const q = await leesUit(page, geval, baseURL!);
    expect(q.get("title")).toBe(geval.titel);
    expect(q.get("cents")).toBe(geval.cents === null ? "" : String(geval.cents));
  });
}
