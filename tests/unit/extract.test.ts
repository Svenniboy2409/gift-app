import { describe, expect, it } from "vitest";
import { extractProduct } from "@/lib/scraper/extract";

describe("extractProduct", () => {
  it("leest een JSON-LD Product uit", () => {
    const html = `
      <html><head>
        <title>Blauwe trui | Voorbeeldshop</title>
        <meta property="og:site_name" content="Voorbeeldshop">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Blauwe wollen trui",
          "description": "Zacht en warm.",
          "image": ["https://cdn.voorbeeld.nl/trui.jpg"],
          "offers": { "@type": "Offer", "price": "49.95", "priceCurrency": "EUR" }
        }
        </script>
      </head><body></body></html>`;

    const result = extractProduct(html, "https://www.voorbeeldshop.nl/p/trui");
    expect(result.title).toBe("Blauwe wollen trui");
    expect(result.priceCents).toBe(4995);
    expect(result.currency).toBe("EUR");
    expect(result.imageUrl).toBe("https://cdn.voorbeeld.nl/trui.jpg");
    expect(result.description).toBe("Zacht en warm.");
  });

  it("vindt het Product binnen een @graph", () => {
    const html = `
      <html><head><script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"WebSite","name":"Shop"},
        {"@type":"Product","name":"Koffiemolen","offers":{"@type":"Offer","price":"129.00","priceCurrency":"EUR"},"image":"https://cdn.shop.nl/molen.png"}
      ]}
      </script></head><body></body></html>`;

    const result = extractProduct(html, "https://shop.nl/molen");
    expect(result.title).toBe("Koffiemolen");
    expect(result.priceCents).toBe(12_900);
  });

  it("valt terug op OpenGraph als er geen JSON-LD is", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Draadloze koptelefoon">
        <meta property="og:image" content="/media/koptelefoon.jpg">
        <meta property="product:price:amount" content="199.99">
        <meta property="product:price:currency" content="EUR">
        <meta property="og:description" content="Met ruisonderdrukking.">
      </head><body></body></html>`;

    const result = extractProduct(html, "https://www.shop.nl/koptelefoon");
    expect(result.title).toBe("Draadloze koptelefoon");
    expect(result.priceCents).toBe(19_999);
    // Relatieve afbeeldingen worden absoluut gemaakt.
    expect(result.imageUrl).toBe("https://www.shop.nl/media/koptelefoon.jpg");
  });

  it("leest microdata als er geen JSON-LD of OpenGraph is", () => {
    const html = `
      <html><body>
        <div itemscope itemtype="https://schema.org/Product">
          <span itemprop="name">Houten puzzel</span>
          <img itemprop="image" src="https://cdn.shop.nl/puzzel.jpg">
          <meta itemprop="price" content="14.50">
          <meta itemprop="priceCurrency" content="EUR">
        </div>
      </body></html>`;

    const result = extractProduct(html, "https://shop.nl/puzzel");
    expect(result.title).toBe("Houten puzzel");
    expect(result.priceCents).toBe(1450);
    expect(result.currency).toBe("EUR");
  });

  it("gebruikt de shop-specifieke prijs bij bol.com", () => {
    // bol.com zet in OpenGraph geregeld een verouderde prijs; de zichtbare
    // prijs op de pagina wint daarom.
    const html = `
      <html><head>
        <meta property="og:title" content="Espressomachine">
        <meta property="og:price:amount" content="249.00">
      </head><body>
        <span data-test="price">179,00</span>
        <img data-test="image" src="https://media.s-bol.com/espresso.jpg">
      </body></html>`;

    const result = extractProduct(html, "https://www.bol.com/nl/p/espressomachine/123/");
    expect(result.priceCents).toBe(17_900);
    expect(result.merchant).toBe("bol");
    expect(result.imageUrl).toBe("https://media.s-bol.com/espresso.jpg");
  });

  it("knipt de winkelnaam van de paginatitel af", () => {
    const html = `
      <html><head>
        <title>Rode sjaal | Voorbeeldshop</title>
        <meta property="og:site_name" content="Voorbeeldshop">
      </head><body><h1>Rode sjaal | Voorbeeldshop</h1></body></html>`;

    const result = extractProduct(html, "https://voorbeeldshop.nl/sjaal");
    expect(result.title).toBe("Rode sjaal");
  });

  it("valt terug op h1 en de eerste grote afbeelding", () => {
    const html = `
      <html><head><title>Shop</title></head><body>
        <img src="/logo.svg" width="40">
        <h1>Keramieken vaas</h1>
        <img src="/media/vaas.jpg" width="800">
      </body></html>`;

    const result = extractProduct(html, "https://shop.nl/vaas");
    expect(result.title).toBe("Keramieken vaas");
    expect(result.imageUrl).toBe("https://shop.nl/media/vaas.jpg");
    expect(result.priceCents).toBeNull();
  });

  it("crasht niet op kapotte JSON-LD", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{ dit is geen json }</script>
        <meta property="og:title" content="Toch een titel">
      </head><body></body></html>`;

    const result = extractProduct(html, "https://shop.nl/x");
    expect(result.title).toBe("Toch een titel");
  });

  it("geeft lege velden terug bij een pagina zonder informatie", () => {
    const result = extractProduct("<html><body></body></html>", "https://shop.nl/");
    expect(result.title).toBeNull();
    expect(result.priceCents).toBeNull();
    expect(result.imageUrl).toBeNull();
  });
});
