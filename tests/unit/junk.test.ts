import { describe, expect, it } from "vitest";
import { cleanTitle, looksLikeJunkTitle } from "@/lib/scraper/junk";

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
