import { describe, expect, it } from "vitest";
import { buildBookmarklet } from "@/lib/bookmarklet";

/**
 * De bewaarknop is één regel JavaScript in een bladwijzer. Twee dingen mogen
 * daar nooit in sluipen, want ze breken hem stilletjes bij de gebruiker die hem
 * al had opgeslagen.
 */
describe("buildBookmarklet", () => {
  const code = buildBookmarklet("https://wenslijst.example");
  const source = decodeURIComponent(code.replace(/^javascript:/, ""));

  it("is één kale regel, zonder commentaar", () => {
    expect(source).not.toContain("\n");
    expect(source).not.toContain("/*");
    // Een //-commentaar zou de rest van de regel opeten. Adressen mogen wel.
    expect(source.replace(/https?:\/\//g, "")).not.toContain("//");
  });

  it("blijft klein genoeg voor een bladwijzer", () => {
    expect(code.length).toBeLessThan(16_000);
  });

  it("wijst naar de app die hem heeft uitgedeeld", () => {
    expect(source).toContain("https://wenslijst.example/add?");
  });

  it("stuurt de prijs in hele centen mee", () => {
    expect(source).toContain("&cents=");
  });

  it("kent de winkelregels van de server", () => {
    expect(source).toContain("bol.com");
    expect(source).toContain("coolblue.nl");
  });
});
