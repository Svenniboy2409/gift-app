import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  acceptInvite,
  createList,
  invitePerson,
  openManualGiftForm,
  register,
  setVisibility,
} from "./helpers";

/**
 * Samen aan één lijst werken: uitnodigen, meedoen, allebei cadeaus toevoegen —
 * en de grenzen daarvan. De instellingen blijven van de eigenaar, en wat hij
 * kiest geldt voor iedereen die meedoet.
 */

async function persoon(browser: Browser, naam: string, prefix: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await register(page, naam, prefix);
  await page.goto("/account");
  const profiel = await page
    .getByRole("link", { name: /^@/ })
    .getAttribute("href");
  return { context, page, handle: profiel!.replace("/u/", "") };
}

/**
 * Nodigt iemand uit vanuit de instellingen van de lijst waar je in staat, en
 * sluit het paneel pas als de uitnodiging er echt staat — anders sluit je hem
 * terwijl de serveractie nog loopt.
 */
async function nodigUit(page: Page, naam: RegExp) {
  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  const paneel = page.getByRole("dialog");
  await paneel.getByRole("button", { name: naam }).click();
  await expect(paneel.getByText("Wacht op antwoord")).toBeVisible();
  await page.keyboard.press("Escape");
}

/** Twee mensen die elkaar als vriend hebben. */
async function vrienden(browser: Browser, prefix: string) {
  const een = await persoon(browser, "Eigenaar Samen", `${prefix}a`);
  const twee = await persoon(browser, "Helper Samen", `${prefix}b`);

  await een.page.goto("/friends");
  await invitePerson(een.page, twee.handle);

  await twee.page.goto("/friends");
  await acceptInvite(twee.page);
  await expect(
    twee.page.getByRole("heading", { name: /Vrienden \(1\)/ }),
  ).toBeVisible();

  return { een, twee };
}

test("een vriend uitnodigen en samen cadeaus toevoegen", async ({ browser }) => {
  const { een, twee } = await vrienden(browser, "col1");

  await een.page.goto("/dashboard");
  await createList(een.page, "Kerstpakket");

  // De eigenaar nodigt zijn vriend uit vanuit de instellingen van de lijst.
  await een.page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  const paneel = een.page.getByRole("dialog");
  await expect(paneel.getByText("Samen invullen")).toBeVisible();
  await paneel.getByRole("button", { name: /Helper Samen/ }).click();
  await expect(paneel.getByText("Wacht op antwoord")).toBeVisible();

  // De uitnodiging komt binnen bij Sociaal.
  await twee.page.goto("/friends");
  await expect(twee.page.getByText("Uitnodigingen voor een lijst")).toBeVisible();
  await expect(twee.page.getByText("Kerstpakket")).toBeVisible();
  await acceptInvite(twee.page);

  // De lijst staat nu ook bij de helper op het overzicht.
  await twee.page.goto("/dashboard");
  await twee.page.getByText("Kerstpakket").click();
  await twee.page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);

  // En de helper mag er cadeaus in zetten.
  await openManualGiftForm(twee.page);
  await twee.page
    .getByRole("dialog")
    .getByLabel("Naam", { exact: true })
    .fill("Kaas van de helper");
  await twee.page
    .getByRole("dialog")
    .getByRole("button", { name: "Cadeau opslaan" })
    .click();
  await expect(
    twee.page.locator("li").filter({ hasText: "Kaas van de helper" }),
  ).toBeVisible();

  // De eigenaar ziet dat cadeau meteen, en beide namen op de omslag.
  await een.page.reload();
  await expect(
    een.page.locator("li").filter({ hasText: "Kaas van de helper" }),
  ).toBeVisible();
  await expect(een.page.getByText(/Samen met/)).toBeVisible();

  await een.context.close();
  await twee.context.close();
});

test("alleen de eigenaar kan de instellingen aanpassen", async ({ browser }) => {
  const { een, twee } = await vrienden(browser, "col2");

  await een.page.goto("/dashboard");
  await createList(een.page, "Gedeelde lijst");
  const pad = new URL(een.page.url()).pathname;

  await nodigUit(een.page, /Helper Samen/);

  await twee.page.goto("/friends");
  await acceptInvite(twee.page);

  // De helper krijgt wel het paneel, maar zonder de velden van de lijst.
  await twee.page.goto(pad);
  await twee.page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  const paneel = twee.page.getByRole("dialog");
  await expect(paneel.getByText("Je werkt mee aan deze lijst")).toBeVisible();
  await expect(paneel.getByLabel("Naam van de lijst")).toHaveCount(0);
  await expect(paneel.getByRole("button", { name: "Lijst verwijderen" })).toHaveCount(0);

  // Wat de eigenaar kiest, geldt voor iedereen: zet hij hem op zijn profiel,
  // dan staat hij ook op het profiel van de helper.
  await twee.page.keyboard.press("Escape");
  await een.page.reload();
  await setVisibility(een.page, "Openbaar");

  await twee.page.goto(`/u/${twee.handle}`);
  await expect(twee.page.getByText("Gedeelde lijst")).toBeVisible();

  await een.context.close();
  await twee.context.close();
});

test("een deelnemer haalt de lijst van zijn eigen profiel", async ({
  browser,
}) => {
  const { een, twee } = await vrienden(browser, "col4");

  await een.page.goto("/dashboard");
  await createList(een.page, "Op ons profiel");
  const pad = new URL(een.page.url()).pathname;

  await nodigUit(een.page, /Helper Samen/);

  await twee.page.goto("/friends");
  await acceptInvite(twee.page);

  // De eigenaar zet hem op ieders profiel.
  await een.page.reload();
  await setVisibility(een.page, "Openbaar");

  await twee.page.goto(`/u/${twee.handle}`);
  await expect(twee.page.getByText("Op ons profiel")).toBeVisible();

  // De deelnemer haalt hem van zijn eigen profiel.
  await twee.page.goto(pad);
  await twee.page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  const paneel = twee.page.getByRole("dialog");
  await paneel.getByRole("button", { name: "Verbergen op mijn profiel" }).click();
  await expect(
    paneel.getByRole("button", { name: "Weer op mijn profiel zetten" }),
  ).toBeVisible();

  await twee.page.goto(`/u/${twee.handle}`);
  await expect(twee.page.getByText("Op ons profiel")).toHaveCount(0);

  // Bij de eigenaar staat hij er nog gewoon op, ook voor de deelnemer die hem
  // net verborgen heeft.
  await twee.page.goto(`/u/${een.handle}`);
  await expect(twee.page.getByText("Op ons profiel")).toBeVisible();

  // En terugzetten kan.
  await twee.page.goto(pad);
  await twee.page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  await twee.page
    .getByRole("dialog")
    .getByRole("button", { name: "Weer op mijn profiel zetten" })
    .click();
  await expect(
    twee.page
      .getByRole("dialog")
      .getByRole("button", { name: "Verbergen op mijn profiel" }),
  ).toBeVisible();

  await twee.page.goto(`/u/${twee.handle}`);
  await expect(twee.page.getByText("Op ons profiel")).toBeVisible();

  await een.context.close();
  await twee.context.close();
});

test("meedoen kan ook via de link van de lijst", async ({ browser }) => {
  const gastheer = await persoon(browser, "Link Gastheer", "col3a");
  const gast = await persoon(browser, "Link Gast", "col3b");

  await gastheer.page.goto("/dashboard");
  await createList(gastheer.page, "Via de link");
  await gastheer.page
    .getByRole("button", { name: "Instellingen van de lijst" })
    .click();

  const paneel = gastheer.page.getByRole("dialog");
  const link = await paneel
    .getByLabel("Uitnodigingslink voor deze lijst")
    .inputValue();
  expect(link).toContain("/j/");

  // De gast is geen vriend, maar met de link mag hij meedoen.
  await gast.page.goto(new URL(link).pathname);
  await expect(gast.page.getByText("Meedoen aan deze lijst?")).toBeVisible();
  await gast.page.getByRole("button", { name: "Meedoen" }).click();
  await gast.page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);

  await expect(
    gast.page.getByRole("heading", { name: "Via de link" }),
  ).toBeVisible();

  await gastheer.context.close();
  await gast.context.close();
});
