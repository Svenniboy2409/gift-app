import { expect, test, type Page } from "@playwright/test";

/**
 * De app op telefoonformaat: navigatiebalk onderaan, niets dat buiten het
 * scherm valt, en geen knop die onder die balk verdwijnt.
 */

async function signUp(page: Page, naam: string) {
  await page.goto("/register");
  await page.getByLabel("Naam").fill(naam);
  await page.getByLabel("E-mailadres").fill(`mob-${Date.now()}@example.com`);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).click();
  await page.waitForURL(/\/dashboard$/);
}

async function makeList(page: Page, titel: string) {
  await page.goto("/lists/new");
  await page.getByLabel("Naam van de lijst").fill(titel);
  await page.getByRole("button", { name: "Lijst maken" }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);
}

/** Steekt er iets buiten het scherm uit? Dan kun je zijwaarts schuiven. */
async function scrollsSideways(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
}

test("de navigatiebalk staat onderaan en brengt je naar beide tabbladen", async ({
  page,
}) => {
  await signUp(page, "Mobiel");

  const balk = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  await expect(balk).toBeVisible();

  // Het actieve tabblad is te herkennen, niet alleen aan de kleur.
  await expect(balk.getByRole("link", { name: "Lijsten" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await balk.getByRole("link", { name: "Instellingen" }).click();
  await page.waitForURL(/\/settings$/);
  await expect(balk.getByRole("link", { name: "Instellingen" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await balk.getByRole("link", { name: "Lijsten" }).click();
  await page.waitForURL(/\/dashboard$/);
});

test("de plusknop maakt een lijst, en binnen een lijst een cadeau", async ({
  page,
}) => {
  await signUp(page, "Plusknop");

  // Op het overzicht: een nieuwe lijst.
  await page.locator(".tabbar-action").click();
  await page.waitForURL(/\/lists\/new$/);
  await page.getByLabel("Naam van de lijst").fill("Sinterklaas");
  await page.getByRole("button", { name: "Lijst maken" }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);

  // In een lijst: de plakbalk in beeld, met de cursor er meteen in.
  await page.locator(".tabbar-action").click();
  await expect(page.locator("#paste-url")).toBeFocused();
});

test("de knop onderaan een formulier valt niet achter de navigatiebalk", async ({
  page,
}) => {
  await signUp(page, "Knoppen");
  await page.goto("/lists/new");

  // Helemaal naar beneden: daar staat de laatste knop van het formulier.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);

  const knop = await page.getByRole("button", { name: "Lijst maken" }).boundingBox();
  const balk = await page.locator(".tabbar").boundingBox();
  expect(knop).not.toBeNull();
  expect(balk).not.toBeNull();
  expect(knop!.y + knop!.height).toBeLessThanOrEqual(balk!.y);
});

test("geen enkele pagina schuift zijwaarts weg", async ({ page }) => {
  await signUp(page, "Breedte");
  await makeList(page, "Verjaardag met een behoorlijk lange naam erbij");

  await page.getByRole("button", { name: "Of vul het zelf in" }).click();
  await page
    .getByLabel("Naam", { exact: true })
    .fill("Draadloze koptelefoon met actieve ruisonderdrukking en etui");
  await page.getByRole("button", { name: "Cadeau opslaan" }).click();
  await page.waitForTimeout(800);

  const deelLink = await page.locator('input[readonly]').inputValue();

  for (const pad of ["/dashboard", "/settings", "/lists/new"]) {
    await page.goto(pad);
    expect(await scrollsSideways(page), `${pad} schuift zijwaarts`).toBe(false);
  }

  // En de kant van de bezoeker, die geen account heeft.
  await page.goto(new URL(deelLink).pathname);
  expect(await scrollsSideways(page), "de deelpagina schuift zijwaarts").toBe(
    false,
  );
});

test("uitloggen kan vanuit de instellingen", async ({ page }) => {
  await signUp(page, "Uitlogger");

  // Op de telefoon staat er geen uitlogknop in de balk bovenaan; die hoort
  // dus in de instellingen te staan, anders kom je er niet meer uit.
  await page.goto("/settings");
  await page.getByRole("button", { name: "Uitloggen" }).click();
  await page.waitForURL(/\/(login)?$/);
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/);
});
