import { describe, expect, it } from "vitest";
import { parseMachinePrice, parsePrice } from "@/lib/scraper/price";
import { parsePriceInput } from "@/lib/validation";

describe("parsePrice (vrije tekst)", () => {
  it("leest Nederlandse notatie", () => {
    expect(parsePrice("€ 1.299,00")).toEqual({ cents: 129_900, currency: "EUR" });
    expect(parsePrice("19,95")).toEqual({ cents: 1995, currency: null });
    expect(parsePrice("€24,99")).toEqual({ cents: 2499, currency: "EUR" });
  });

  it("leest Engelse notatie", () => {
    expect(parsePrice("$1,299.00")).toEqual({ cents: 129_900, currency: "USD" });
    expect(parsePrice("£9.99")).toEqual({ cents: 999, currency: "GBP" });
  });

  it("negeert omringende tekst", () => {
    expect(parsePrice("vanaf €24,99 per stuk")?.cents).toBe(2499);
    expect(parsePrice("Nu voor slechts EUR 30")).toEqual({
      cents: 3000,
      currency: "EUR",
    });
  });

  it("geeft null bij onbruikbare invoer", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice("op aanvraag")).toBeNull();
  });

  it("leest hele bedragen zonder decimalen", () => {
    expect(parsePrice("€ 1.250")?.cents).toBe(125_000);
    expect(parsePrice("35")?.cents).toBe(3500);
  });
});

describe("parseMachinePrice (schema.org / OpenGraph)", () => {
  it("behandelt de punt altijd als decimaalteken", () => {
    expect(parseMachinePrice("1299.00")).toBe(129_900);
    expect(parseMachinePrice("19.99")).toBe(1999);
    expect(parseMachinePrice(24.5)).toBe(2450);
  });

  it("accepteert een komma als decimaalteken", () => {
    expect(parseMachinePrice("19,99")).toBe(1999);
  });

  it("negeert duizendtal-komma's", () => {
    expect(parseMachinePrice("1,299.00")).toBe(129_900);
  });

  it("geeft null bij lege of ongeldige invoer", () => {
    expect(parseMachinePrice(null)).toBeNull();
    expect(parseMachinePrice("")).toBeNull();
    expect(parseMachinePrice("gratis")).toBeNull();
  });
});

describe("parsePriceInput (handmatig ingevuld veld)", () => {
  it("accepteert wat een gebruiker realistisch intypt", () => {
    expect(parsePriceInput("19,95")).toBe(1995);
    expect(parsePriceInput("€ 1.299,00")).toBe(129_900);
    expect(parsePriceInput("24.99")).toBe(2499);
    expect(parsePriceInput("30")).toBe(3000);
    expect(parsePriceInput("")).toBeNull();
  });
});
