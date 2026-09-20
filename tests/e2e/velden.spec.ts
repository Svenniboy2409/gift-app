import { expect, test, type Page } from "@playwright/test";
import { createList, openManualGiftForm, register } from "./helpers";

/**
 * De invulbalken: leegmaken met één tik, een eigen gelegenheid bij "Anders",
 * en een datumveld dat niet uit de toon valt.
 */

async function openInstellingen(page: Page) {
  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
}

test("een balk krijgt een kruisje zodra er iets in staat", async ({ page }) => {
  await register(page, "Wisser", "wis");
  await createList(page, "Wislijst");
  await openInstellingen(page);

  const paneel = page.getByRole("dialog");
  const omschrijving = paneel.getByLabel("Omschrijving (optioneel)");
  const kruisjes = paneel.getByRole("button", { name: "Leegmaken" });

  // De titel staat al vol, dus die heeft er een; de lege omschrijving niet.
  const voor = await kruisjes.count();
  expect(voor).toBe(1);

  await omschrijving.fill("Iets wat ik wil");
  await expect(kruisjes).toHaveCount(2);

  // Leegmaken haalt het kruisje weer weg — en het veld is echt leeg.
  await kruisjes.nth(1).click();
  await expect(omschrijving).toHaveValue("");
  await expect(kruisjes).toHaveCount(1);
});

test("een gekozen datum kun je er met een tik weer afhalen", async ({
  page,
}) => {
  await register(page, "Datumkiezer", "datum");
  await createList(page, "Datumlijst");
  await openInstellingen(page);

  const paneel = page.getByRole("dialog");
  const datum = paneel.getByLabel(/^Datum/);
  await expect(paneel.getByRole("button", { name: "Leegmaken" })).toHaveCount(1);

  await datum.fill("2026-12-05");
  await expect(paneel.getByRole("button", { name: "Leegmaken" })).toHaveCount(2);

  // Een datum tik je niet, die kies je — zonder kruisje kom je er niet vanaf.
  await paneel
    .getByRole("button", { name: "Leegmaken" })
    .nth(1)
    .click();
  await expect(datum).toHaveValue("");

  // En het blijft leeg nadat je hebt opgeslagen.
  await paneel.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openInstellingen(page);
  await expect(page.getByRole("dialog").getByLabel(/^Datum/)).toHaveValue("");
});

test("het datumveld is even breed als de balk ernaast", async ({ page }) => {
  await register(page, "Meter", "breed");
  await createList(page, "Meetlijst");
  await openInstellingen(page);

  const paneel = page.getByRole("dialog");
  // De gelegenheid en de datum delen een rij, dus ze horen even breed te zijn.
  // Een datumveld brengt zijn eigen, bredere maat mee als je die niet uitzet,
  // en trekt de balk dan verder door dan alle andere.
  const gelegenheid = await paneel
    .getByLabel("Gelegenheid", { exact: true })
    .boundingBox();
  const datum = await paneel.getByLabel(/^Datum/).boundingBox();
  expect(Math.abs(datum!.width - gelegenheid!.width)).toBeLessThanOrEqual(1);

  // En de maatvoering van de browser zelf staat uit — dat is wat het op een
  // iPhone scheeftrekt, en wat we hier niet kunnen naspelen.
  expect(
    await paneel
      .getByLabel(/^Datum/)
      .evaluate((el) => getComputedStyle(el).appearance),
  ).toBe("none");
});

test("bij Anders vul je zelf in waar de lijst voor is", async ({ page }) => {
  await register(page, "Anderser", "anders");
  await createList(page, "Feestlijst");
  await openInstellingen(page);

  const paneel = page.getByRole("dialog");
  // Zonder "Anders" is er niets in te vullen.
  await paneel.getByLabel("Gelegenheid", { exact: true }).selectOption("BIRTHDAY");
  await expect(paneel.getByLabel("Welke gelegenheid?")).toHaveCount(0);

  await paneel.getByLabel("Gelegenheid", { exact: true }).selectOption("OTHER");
  const eigen = paneel.getByLabel("Welke gelegenheid?");
  await expect(eigen).toBeVisible();

  // Leeg gelaten: dan blijft het gewoon "Anders".
  await paneel.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Anders", { exact: true })).toBeVisible();

  // Wel ingevuld: dan staat dat op de omslag, en ook op het overzicht.
  await openInstellingen(page);
  await page.getByRole("dialog").getByLabel("Welke gelegenheid?").fill("Jubileum");
  await page.getByRole("dialog").getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Jubileum", { exact: true })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Jubileum", { exact: true })).toBeVisible();
});

test("een enter in een omschrijving blijft een enter", async ({ page }) => {
  await register(page, "Schrijver", "enter");
  await createList(page, "Regellijst");
  await openInstellingen(page);

  await page
    .getByRole("dialog")
    .getByLabel("Omschrijving (optioneel)")
    .fill("Eerste regel\nTweede regel");
  await page.getByRole("dialog").getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  /** Hoeveel regels beslaat de omschrijving op het scherm? */
  const regels = (waar: string) =>
    page.locator(waar).evaluate((el) => {
      const stijl = getComputedStyle(el);
      return Math.round(el.getBoundingClientRect().height / parseFloat(stijl.lineHeight));
    });

  // Twee regels tekst horen twee regels hoog te zijn, niet één.
  expect(await regels("main p.whitespace-pre-line")).toBe(2);

  // Ook op het overzicht, waar hetzelfde kaartje staat als op je profiel.
  await page.goto("/dashboard");
  await expect(page.getByText("Eerste regel")).toBeVisible();
  expect(await regels("a p.whitespace-pre-line")).toBe(2);
});

test("een cadeau bewerken houdt zijn kruisjes", async ({ page }) => {
  await register(page, "Cadeauwisser", "cwis");
  await createList(page, "Cadeaulijst");

  await openManualGiftForm(page);
  const paneel = page.getByRole("dialog");
  await paneel.getByLabel("Naam", { exact: true }).fill("Koptelefoon");
  const kruisjes = paneel.getByRole("button", { name: "Leegmaken" });
  await expect(kruisjes).toHaveCount(1);

  await kruisjes.first().click();
  await expect(paneel.getByLabel("Naam", { exact: true })).toHaveValue("");
});
