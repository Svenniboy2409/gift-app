import { expect, test } from "@playwright/test";
import { createList, openManualGiftForm, register } from "./helpers";

/**
 * Snelheid zoals je hem merkt.
 *
 * Verschuiven en weggooien moeten aanvoelen als slepen op je eigen telefoon:
 * meteen raak, en je kunt direct door. Het opsturen naar de database loopt er
 * op de achtergrond achteraan.
 */

async function addGift(page: import("@playwright/test").Page, naam: string) {
  await openManualGiftForm(page);
  const paneel = page.getByRole("dialog");
  await paneel.getByLabel("Naam", { exact: true }).fill(naam);
  await paneel.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: naam })).toBeVisible();
}

/** De titels van de cadeaus, van boven naar beneden. */
async function volgorde(page: import("@playwright/test").Page) {
  return page.locator("ul > li h3").allInnerTexts();
}

test("verschuiven is meteen te zien en je kunt meteen door", async ({
  page,
}) => {
  await register(page, "Schuiver", "reorder");
  await createList(page, "Schuiflijst");
  for (const naam of ["Een", "Twee", "Drie", "Vier"]) await addGift(page, naam);

  expect(await volgorde(page)).toEqual(["Een", "Twee", "Drie", "Vier"]);

  // Drie keer achter elkaar klikken, zonder tussendoor te wachten: "Vier" moet
  // in één vloeiende beweging helemaal naar boven lopen.
  const vier = page.locator("li").filter({ has: page.getByRole("heading", { name: "Vier" }) });
  for (let keer = 0; keer < 3; keer += 1) {
    await vier.getByRole("button", { name: "Omhoog" }).click();
  }

  // Meteen, zonder op de server te wachten.
  await expect
    .poll(() => volgorde(page), { timeout: 2_000 })
    .toEqual(["Vier", "Een", "Twee", "Drie"]);

  // En daarna staat het ook echt zo in de database.
  await page.waitForTimeout(2_500);
  await page.reload();
  expect(await volgorde(page)).toEqual(["Vier", "Een", "Twee", "Drie"]);
});

test("weggooien haalt het cadeau meteen uit beeld", async ({ page }) => {
  await register(page, "Weggooier", "reorder");
  await createList(page, "Opruimlijst");
  for (const naam of ["Blijft", "Weg"]) await addGift(page, naam);

  page.once("dialog", (venster) => venster.accept());
  await page
    .locator("li")
    .filter({ has: page.getByRole("heading", { name: "Weg" }) })
    .getByRole("button", { name: "Verwijderen" })
    .click();

  await expect
    .poll(() => volgorde(page), { timeout: 2_000 })
    .toEqual(["Blijft"]);

  await page.waitForTimeout(1_500);
  await page.reload();
  expect(await volgorde(page)).toEqual(["Blijft"]);
});
