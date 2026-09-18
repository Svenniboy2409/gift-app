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

/**
 * De tabbladen en de lijstkaartjes halen hun pagina alvast op. Klikken hoort
 * die pagina dan niet meer bij de server op te hoeven halen: hij staat al
 * klaar. Zonder dat vooruit ophalen is elke tik een volledige ronde naar de
 * server, en dat is precies wat er seconden kostte.
 */
test("tabbladen en lijsten staan al klaar voordat je klikt", async ({
  page,
}) => {
  await register(page, "Snelklikker", "prefetch");
  await createList(page, "Vooruitlijst");
  await addGift(page, "Iets moois");

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Vooruitlijst" })).toBeVisible();
  // Even de tijd geven om alles op de achtergrond op te halen.
  await page.waitForTimeout(3_000);

  /** Alles wat de browser bij de server opvraagt terwijl we klikken. */
  const opgevraagd: string[] = [];
  page.on("request", (verzoek) => {
    const url = new URL(verzoek.url());
    if (url.searchParams.has("_rsc")) opgevraagd.push(url.pathname);
  });

  /**
   * Alleen het adres waar we heen gaan telt: wat de nieuwe pagina daarna zelf
   * vooruit ophaalt gebeurt op de achtergrond, en daar wacht niemand op.
   */
  function nietOpgehaald(pad: string) {
    expect(opgevraagd.filter((adres) => adres === pad)).toEqual([]);
  }

  opgevraagd.length = 0;
  await page
    .locator("a")
    .filter({ has: page.getByRole("heading", { name: "Vooruitlijst" }) })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Iets moois" })).toBeVisible();
  nietOpgehaald(new URL(page.url()).pathname);

  opgevraagd.length = 0;
  await page.getByRole("link", { name: "Terug naar mijn lijsten" }).click();
  await page.waitForURL(/\/dashboard$/);
  nietOpgehaald("/dashboard");

  opgevraagd.length = 0;
  await page.getByRole("link", { name: "Sociaal" }).first().click();
  await page.waitForURL(/\/friends$/);
  nietOpgehaald("/friends");

  opgevraagd.length = 0;
  await page.getByRole("link", { name: "Account" }).first().click();
  await page.waitForURL(/\/account$/);
  nietOpgehaald("/account");
});
