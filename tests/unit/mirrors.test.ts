import { describe, expect, it } from "vitest";
import { mirrorFor } from "@/lib/scraper/mirrors";

/**
 * De Belgische winkel van bol draait op dezelfde catalogus. We wijzen er alleen
 * heen als we zeker weten om welk product het gaat.
 */
describe("mirrorFor", () => {
  it("wijst een Nederlandse bol-link naar de Belgische winkel", () => {
    const mirror = mirrorFor(
      "https://www.bol.com/nl/nl/p/lego-classic/9300000130744527/",
    );
    expect(mirror?.url).toBe(
      "https://www.bol.com/be/nl/p/lego-classic/9300000130744527/",
    );
  });

  it("herkent dat de andere winkel hetzelfde product teruggaf", () => {
    const mirror = mirrorFor(
      "https://www.bol.com/nl/nl/p/lego-classic/9300000130744527/",
    );
    expect(
      mirror?.belongsToSameProduct(
        "https://www.bol.com/be/nl/p/lego-classic-11035/9300000130744527/",
      ),
    ).toBe(true);
  });

  it("weigert een pagina van een ander product", () => {
    const mirror = mirrorFor(
      "https://www.bol.com/nl/nl/p/lego-classic/9300000130744527/",
    );
    // Doorgestuurd naar de voorpagina of naar iets anders: niet gebruiken.
    expect(mirror?.belongsToSameProduct("https://www.bol.com/be/nl/")).toBe(false);
    expect(
      mirror?.belongsToSameProduct(
        "https://www.bol.com/be/nl/p/ander-product/9300000999999999/",
      ),
    ).toBe(false);
  });

  it("laat andere winkels en andere linkvormen met rust", () => {
    expect(mirrorFor("https://www.coolblue.nl/product/948094/sony.html")).toBeNull();
    expect(mirrorFor("https://www.amazon.nl/dp/B08N5WRWNW")).toBeNull();
    // Al een Belgische link, of een zoekpagina zonder product-id.
    expect(mirrorFor("https://www.bol.com/be/nl/p/lego/9300000130744527/")).toBeNull();
    expect(mirrorFor("https://www.bol.com/nl/nl/s/?searchtext=lego")).toBeNull();
    expect(mirrorFor("geen link")).toBeNull();
  });
});
