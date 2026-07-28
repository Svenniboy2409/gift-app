import { describe, expect, it } from "vitest";
import {
  cleanTitle,
  looksLikeJunkImage,
  looksLikeJunkTitle,
} from "@/lib/scraper/junk";

describe("looksLikeJunkTitle", () => {
  it("herkent de winkelnaam als titel", () => {
    // Dit is precies wat Amazon terugstuurt bij een botcontrole.
    expect(looksLikeJunkTitle("Amazon.nl", "www.amazon.nl")).toBe(true);
    expect(looksLikeJunkTitle("Amazon", "www.amazon.nl")).toBe(true);
    expect(looksLikeJunkTitle("bol.com", "www.bol.com")).toBe(true);
    expect(looksLikeJunkTitle("Coolblue", "www.coolblue.nl")).toBe(true);
  });

  it("herkent controlepagina's en foutmeldingen", () => {
    const rommel = [
      "Robot Check",
      "Even geduld alstublieft",
      "Just a moment...",
      "Attention Required! | Cloudflare",
      "Access Denied",
      "Toegang geweigerd",
      "Sorry! Something went wrong!",
      "404 Not Found",
      "403 Forbidden",
      "Service Unavailable",
      "Security check",
      "Please enable JavaScript to continue",
    ];
    for (const titel of rommel) {
      expect(looksLikeJunkTitle(titel), titel).toBe(true);
    }
  });

  it("weigert lege en betekenisloze titels", () => {
    expect(looksLikeJunkTitle(null)).toBe(true);
    expect(looksLikeJunkTitle("")).toBe(true);
    expect(looksLikeJunkTitle("  ")).toBe(true);
    expect(looksLikeJunkTitle("ab")).toBe(true);
    expect(looksLikeJunkTitle("12345")).toBe(true);
    expect(looksLikeJunkTitle("--- ---")).toBe(true);
  });

  it("laat echte productnamen met rust", () => {
    const echt = [
      "Sonos Era 100 draadloze speaker",
      "LEGO Classic Creatieve Superset 11036",
      "BILLY boekenkast, wit 80x28x202 cm",
      "Blauwe wollen trui maat M",
      // Winkelnaam die deel is van een langere naam mag blijven staan.
      "Amazon Echo Dot 5e generatie",
    ];
    for (const titel of echt) {
      expect(looksLikeJunkTitle(titel, "www.amazon.nl"), titel).toBe(false);
    }
  });
});

describe("cleanTitle", () => {
  it("geeft null bij rommel en de titel bij een echt product", () => {
    expect(cleanTitle("Amazon.nl", "www.amazon.nl")).toBeNull();
    expect(cleanTitle("  Sonos Era 100  ", "www.amazon.nl")).toBe("Sonos Era 100");
  });
});

describe("foutpagina's van de leesdiensten", () => {
  it("herkent de blokkademelding van r.jina.ai", () => {
    expect(looksLikeJunkTitle("IP address 34.96.49.86 is blocked")).toBe(true);
    expect(looksLikeJunkTitle("Your IP is blocked")).toBe(true);
    expect(looksLikeJunkTitle("Rate limit exceeded")).toBe(true);
    expect(looksLikeJunkTitle("Too Many Requests")).toBe(true);
    expect(looksLikeJunkTitle("Error fetching page")).toBe(true);
    expect(looksLikeJunkTitle("Tijdelijk niet beschikbaar")).toBe(true);
  });

  it("laat producten met een cijfer of adres in de naam met rust", () => {
    expect(looksLikeJunkTitle("Sonos Era 100 draadloze speaker")).toBe(false);
    expect(looksLikeJunkTitle("BILLY boekenkast 80x28x202 cm")).toBe(false);
  });
});

describe("looksLikeJunkImage", () => {
  it("weigert de illustratie van een foutpagina", () => {
    // bol.com serveert bij een fout een plaatje met "Oeps" erop; die belandde
    // als productfoto in de lijst.
    expect(looksLikeJunkImage("https://s.s-bol.com/nl/static/oeps.png")).toBe(true);
    expect(looksLikeJunkImage("https://shop.nl/img/oops-404.jpg")).toBe(true);
    expect(looksLikeJunkImage("https://shop.nl/error-page.png")).toBe(true);
    expect(looksLikeJunkImage("https://shop.nl/no-image.png")).toBe(true);
    expect(looksLikeJunkImage("https://shop.nl/placeholder.jpg")).toBe(true);
    expect(looksLikeJunkImage("https://shop.nl/geen-afbeelding.png")).toBe(true);
  });

  it("weigert logo's, iconen en niet-URL's", () => {
    expect(looksLikeJunkImage("https://shop.nl/logo.svg")).toBe(true);
    expect(looksLikeJunkImage("https://shop.nl/favicon.ico")).toBe(true);
    expect(looksLikeJunkImage("data:image/png;base64,AAA")).toBe(true);
    expect(looksLikeJunkImage("/relatief/pad.jpg")).toBe(true);
    expect(looksLikeJunkImage(null)).toBe(true);
  });

  it("laat echte productfoto's door", () => {
    expect(
      looksLikeJunkImage("https://media.s-bol.com/AbCd/550x496.jpg"),
    ).toBe(false);
    expect(
      looksLikeJunkImage("https://m.media-amazon.com/images/I/71abc._AC_SL1500_.jpg"),
    ).toBe(false);
    expect(looksLikeJunkImage("https://cdn.hema.nl/badjas-wit.jpg")).toBe(false);
  });
});
