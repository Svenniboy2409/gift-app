import { describe, expect, it } from "vitest";
import { COVER_COLORS, accentClass, isCoverColor } from "@/lib/covers";

describe("accentClass", () => {
  it("geeft per omslagkleur zijn eigen klasse", () => {
    for (const kleur of COVER_COLORS) {
      expect(accentClass(kleur)).toBe(`accent-${kleur}`);
    }
  });

  it("valt terug op de kleur van de app zelf", () => {
    // Een lijst uit een oudere versie, of onzin uit een formulier: dan liever
    // het vertrouwde oranje dan een klasse die nergens bestaat en de kleur van
    // de vorige lijst laat staan.
    expect(accentClass("kanariegeel")).toBe("accent-terracotta");
    expect(accentClass("")).toBe("accent-terracotta");
  });

  it("herkent alleen de kleuren die we echt hebben", () => {
    expect(isCoverColor("ocean")).toBe(true);
    expect(isCoverColor("Ocean")).toBe(false);
  });
});
