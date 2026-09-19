import { expect, test, type Page } from "@playwright/test";
import { createList, openManualGiftForm, register } from "./helpers";
import { COVER_COLORS } from "@/lib/covers";

/**
 * De kleur van de omslag kleurt de hele lijst mee.
 *
 * Kies je blauw, dan worden de deelknop, de opslaanknop en de prijs van een
 * cadeau ook blauw. Dat loopt via vier CSS-variabelen op een klasse per kleur;
 * hieronder kijken we of die variabelen kloppen én of ze echt op het scherm
 * terechtkomen.
 */

/**
 * Rechtstreeks uit de app, niet overgetypt: komt er een kleur bij, dan wordt
 * die hier vanzelf meegenomen.
 */
const KLEUREN = COVER_COLORS;

/** De vier variabelen zoals de browser ze uitrekent voor één klasse. */
async function accentVan(page: Page, klasse: string) {
  return page.evaluate((naam) => {
    const proef = document.createElement("div");
    proef.className = `accent-${naam}`;
    document.body.append(proef);
    const stijl = getComputedStyle(proef);
    const waarden = {
      accent: stijl.getPropertyValue("--accent").trim(),
      hover: stijl.getPropertyValue("--accent-hover").trim(),
      soft: stijl.getPropertyValue("--accent-soft").trim(),
      text: stijl.getPropertyValue("--accent-text").trim(),
    };
    proef.remove();
    return waarden;
  }, klasse);
}

test("elke omslagkleur heeft een eigen, volledig accent", async ({ page }) => {
  await register(page, "Paletteur", "palet");

  const gezien = new Set<string>();
  for (const kleur of KLEUREN) {
    const waarden = await accentVan(page, kleur);
    // Alle vier gevuld: één vergeten regel in globals.css en je houdt de
    // kleur van de vorige lijst over.
    for (const [naam, waarde] of Object.entries(waarden)) {
      expect(waarde, `${kleur} mist --accent-${naam}`).not.toBe("");
    }
    gezien.add(waarden.accent);
  }
  // En ze verschillen echt van elkaar.
  expect(gezien.size).toBe(KLEUREN.length);
});

test("elke omslagkleur heeft ook een verloop voor de banner", async ({
  page,
}) => {
  await register(page, "Bannerman", "banner");

  const verlopen = await page.evaluate((kleuren) => {
    const gevonden: Record<string, string> = {};
    for (const naam of kleuren) {
      const proef = document.createElement("div");
      proef.className = `cover-${naam}`;
      document.body.append(proef);
      gevonden[naam] = getComputedStyle(proef).backgroundImage;
      proef.remove();
    }
    return gevonden;
  }, [...KLEUREN]);

  // Zonder verloop krijg je een doorzichtige banner met witte tekst erop.
  for (const [naam, verloop] of Object.entries(verlopen)) {
    expect(verloop, `${naam} mist zijn verloop`).toContain("gradient");
  }
  expect(new Set(Object.values(verlopen)).size).toBe(KLEUREN.length);
});

test("elke omslagkleur heeft een naam in beide talen", async ({ page }) => {
  await register(page, "Namer", "naam");
  await createList(page, "Naamlijst");

  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);

  // De knopjes heten naar hun kleur; een ontbrekende vertaling laat de sleutel
  // zelf staan ("color.sand") en dat is meteen te zien.
  async function namen() {
    return page
      .locator("[aria-pressed]")
      .evaluateAll((knoppen) =>
        knoppen
          .map((knop) => knop.getAttribute("title") ?? "")
          .filter((naam) => naam !== ""),
      );
  }

  async function controleer(taal: string) {
    const gevonden = await namen();
    expect(gevonden, taal).toHaveLength(KLEUREN.length);
    for (const naam of gevonden) {
      expect(naam, `${taal}: ${naam}`).not.toContain("color.");
    }
    return gevonden;
  }

  const nederlands = await controleer("nl");

  // En hetzelfde in het Engels. Eerst het paneel dicht: de taalknop staat in
  // de balk erachter en is anders niet aan te klikken.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "List settings" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "List settings" }).click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
  const engels = await controleer("en");

  // Het zijn ook echt vertalingen en niet twee keer dezelfde lijst.
  expect(engels).not.toEqual(nederlands);
});

test("de lijst neemt de kleur van zijn omslag over", async ({ page }) => {
  await register(page, "Kleurder", "kleur");
  await createList(page, "Kleurlijst");

  await openManualGiftForm(page);
  const invullen = page.getByRole("dialog");
  await invullen.getByLabel("Naam", { exact: true }).fill("Koptelefoon");
  await invullen.getByLabel(/Prijs/).first().fill("129,95");
  await invullen.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(page.getByRole("heading", { name: "Koptelefoon" })).toBeVisible();

  const prijs = page.getByText("129,95");
  const oranje = await prijs.evaluate((el) => getComputedStyle(el).color);

  // Zet de lijst op de blauwe omslag.
  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Oceaan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const oceaan = await accentVan(page, "ocean");
  const blauw = await prijs.evaluate((el) => getComputedStyle(el).color);
  expect(blauw).not.toBe(oranje);

  // De prijs, de deelknop en de omslag gebruiken allemaal dezelfde kleur.
  const uitLijst = await page
    .locator(".accent-ocean")
    .first()
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--accent").trim());
  expect(uitLijst).toBe(oceaan.accent);

  // En na herladen staat hij er nog steeds.
  await page.reload();
  expect(await prijs.evaluate((el) => getComputedStyle(el).color)).toBe(blauw);
});

test("de kleur is al te zien terwijl je hem kiest", async ({ page }) => {
  await register(page, "Kiezer", "kies");
  await createList(page, "Kieslijst");

  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  const paneel = page.getByRole("dialog");
  await paneel.waitFor();
  await page.waitForTimeout(300);

  const opslaan = paneel.getByRole("button", { name: "Opslaan" });
  const voor = await opslaan.evaluate((el) => getComputedStyle(el).backgroundColor);

  // Alleen aanklikken, nog niet opslaan.
  await page.getByRole("button", { name: "Olijf" }).click();
  await page.waitForTimeout(200);
  const na = await opslaan.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(na).not.toBe(voor);
});

test("wie de lijst bezoekt ziet dezelfde kleur", async ({ page }) => {
  await register(page, "Deler", "deelkleur");
  await createList(page, "Deellijst");

  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Pruim" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const link = await page.locator("input[readonly]").first().inputValue();
  const pruim = await accentVan(page, "plum");

  // Uitgelogd kijken, zoals iemand die de link krijgt.
  await page.context().clearCookies();
  await page.goto(new URL(link).pathname);
  await expect(page.getByRole("heading", { name: "Deellijst" })).toBeVisible();

  const opBezoek = await page
    .locator(".accent-plum")
    .first()
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--accent").trim());
  expect(opBezoek).toBe(pruim.accent);
});
