import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * De omweg via de Belgische winkel van bol. We zetten het ophalen van pagina's
 * vast, zodat we precies kunnen nabootsen wat een geblokkeerde winkel doet.
 */

const fetchHtml = vi.fn();

vi.mock("@/lib/scraper/safe-fetch", () => ({
  fetchHtml: (url: string) => fetchHtml(url),
  FetchBlockedError: class FetchBlockedError extends Error {},
}));

const { fetchProductPage } = await import("@/lib/scraper/fetch-product");

const NL = "https://www.bol.com/nl/nl/p/lego-classic/9300000130744527/";
const BE = "https://www.bol.com/be/nl/p/lego-classic/9300000130744527/";

const PRODUCT = `<html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"LEGO Classic bakstenen",
 "offers":{"@type":"Offer","price":"29.99","priceCurrency":"EUR"}}
</script></head><body></body></html>`;

const GEBLOKKEERD = { html: "", finalUrl: NL, status: 403 };

beforeEach(() => fetchHtml.mockReset());

describe("fetchProductPage", () => {
  it("leest gewoon de pagina als die binnenkomt", async () => {
    fetchHtml.mockResolvedValueOnce({ html: PRODUCT, finalUrl: NL, status: 200 });

    const result = await fetchProductPage(NL);
    expect(result.product.title).toBe("LEGO Classic bakstenen");
    expect(result.reason).toBeUndefined();
    expect(fetchHtml).toHaveBeenCalledTimes(1);
  });

  it("wijkt uit naar de Belgische winkel als de Nederlandse dichtzit", async () => {
    fetchHtml
      .mockResolvedValueOnce(GEBLOKKEERD)
      .mockResolvedValueOnce({ html: PRODUCT, finalUrl: BE, status: 200 });

    const result = await fetchProductPage(NL);
    expect(fetchHtml).toHaveBeenNthCalledWith(2, BE);
    expect(result.product.title).toBe("LEGO Classic bakstenen");
    expect(result.product.priceCents).toBe(2999);
    // De gebruiker houdt zijn eigen link, en hoort waar de gegevens vandaan komen.
    expect(result.finalUrl).toBe(NL);
    expect(result.reason).toBe("other-store");
  });

  it("gebruikt de andere winkel niet als daar een ander product staat", async () => {
    fetchHtml
      .mockResolvedValueOnce(GEBLOKKEERD)
      .mockResolvedValueOnce({
        html: PRODUCT,
        finalUrl: "https://www.bol.com/be/nl/",
        status: 200,
      });

    const result = await fetchProductPage(NL);
    expect(result.product).toEqual({});
    expect(result.reason).toBe("blocked");
  });

  it("probeert geen omweg bij een winkel die er geen heeft", async () => {
    fetchHtml.mockResolvedValueOnce({
      html: "",
      finalUrl: "https://www.amazon.nl/dp/B08N5WRWNW",
      status: 403,
    });

    const result = await fetchProductPage("https://www.amazon.nl/dp/B08N5WRWNW");
    expect(fetchHtml).toHaveBeenCalledTimes(1);
    expect(result.reason).toBe("blocked");
  });

  it("valt terug op geblokkeerd als ook de andere winkel weigert", async () => {
    fetchHtml
      .mockResolvedValueOnce(GEBLOKKEERD)
      .mockResolvedValueOnce({ html: "", finalUrl: BE, status: 403 });

    const result = await fetchProductPage(NL);
    expect(result.reason).toBe("blocked");
  });

  it("breekt af bij een adres in het interne netwerk", async () => {
    const { FetchBlockedError } = await import("@/lib/scraper/safe-fetch");
    fetchHtml.mockRejectedValueOnce(new FetchBlockedError("private-address"));

    const result = await fetchProductPage("http://127.0.0.1/p");
    expect(result.fatal).toBe("private-address");
  });

  it("wijkt ook uit als de winkel een controlepagina met status 200 stuurt", async () => {
    // Bol antwoordt bij een botcontrole soms gewoon met 200; extractFromHtml
    // houdt daar niets aan over, en dan moet de omweg alsnog geprobeerd worden.
    const controle = `<html><head><title>Oeps! Er ging iets mis</title></head>
      <body><h1>Even geduld</h1></body></html>`;
    fetchHtml
      .mockResolvedValueOnce({ html: controle, finalUrl: NL, status: 200 })
      .mockResolvedValueOnce({ html: PRODUCT, finalUrl: BE, status: 200 });

    const result = await fetchProductPage(NL);
    expect(result.product.title).toBe("LEGO Classic bakstenen");
    expect(result.reason).toBe("other-store");
  });

  it("laat een lege pagina van een andere winkel met rust", async () => {
    fetchHtml.mockResolvedValueOnce({
      html: "<html><head><title>Oeps</title></head><body></body></html>",
      finalUrl: "https://www.coolblue.nl/product/1/x.html",
      status: 200,
    });

    const result = await fetchProductPage("https://www.coolblue.nl/product/1/x.html");
    expect(fetchHtml).toHaveBeenCalledTimes(1);
    expect(result.reason).toBeUndefined();
  });
});
