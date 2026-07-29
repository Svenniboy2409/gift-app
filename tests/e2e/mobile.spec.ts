import { expect, test, type Page } from "@playwright/test";
import { createList, openGiftSheet, register } from "./helpers";

/**
 * De app op telefoonformaat: navigatiebalk onderaan, het schuifpaneel om iets
 * toe te voegen, niets dat buiten het scherm valt, en geen knop die onder die
 * balk verdwijnt.
 */

/** Steekt er iets buiten het scherm uit? Dan kun je zijwaarts schuiven. */
async function scrollsSideways(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
}

test("de navigatiebalk staat onderaan en brengt je naar beide tabbladen", async ({
  page,
}) => {
  await register(page, "Mobiel", "mob");

  const balk = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  await expect(balk).toBeVisible();

  // Het actieve tabblad is te herkennen, niet alleen aan de kleur.
  await expect(balk.getByRole("link", { name: "Lijsten" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await balk.getByRole("link", { name: "Account" }).click();
  await page.waitForURL(/\/account$/);
  await expect(balk.getByRole("link", { name: "Account" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // De instellingen zitten achter het tandwiel linksboven op je account.
  await page.getByRole("link", { name: "Instellingen" }).first().click();
  await page.waitForURL(/\/settings$/);
  await expect(balk.getByRole("link", { name: "Account" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await balk.getByRole("link", { name: "Sociaal" }).click();
  await page.waitForURL(/\/friends$/);
  await expect(balk.getByRole("link", { name: "Sociaal" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await balk.getByRole("link", { name: "Lijsten" }).click();
  await page.waitForURL(/\/dashboard$/);
});

test("de plusknop opent het toevoegscherm met de lijst waar je in zit", async ({
  page,
}) => {
  await register(page, "Paneel", "mob2");
  await createList(page, "Verjaardag");
  await page.goto("/dashboard");
  await createList(page, "Kerst");

  // We staan nu in Kerst; die hoort al aangevinkt te staan.
  await openGiftSheet(page);
  const paneel = page.getByRole("dialog");
  await expect(paneel.getByRole("button", { name: "Kerst" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    paneel.getByRole("button", { name: "Verjaardag" }),
  ).toHaveAttribute("aria-pressed", "false");

  // En de link staat in hetzelfde paneel, niet meer op de pagina erachter.
  await expect(
    paneel.getByPlaceholder("Plak hier een link naar een product…"),
  ).toBeVisible();
});

test("een cadeau kan in twee lijsten tegelijk", async ({ page }) => {
  await register(page, "Twee lijsten", "mob3");
  await createList(page, "Verjaardag");
  await page.goto("/dashboard");
  await createList(page, "Kerst");

  await openGiftSheet(page);
  const paneel = page.getByRole("dialog");
  await paneel.getByRole("button", { name: "Verjaardag" }).click();
  await paneel.getByRole("button", { name: "Of vul het zelf in" }).click();
  await paneel.getByLabel("Naam", { exact: true }).fill("Espressomachine");
  await paneel.getByRole("button", { name: "Cadeau opslaan" }).click();

  // In de lijst waar we stonden staat hij meteen.
  await expect(
    page.locator("li").filter({ hasText: "Espressomachine" }),
  ).toBeVisible();

  // En in de andere lijst ook.
  await page.goto("/dashboard");
  await page.getByText("Verjaardag", { exact: true }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);
  await expect(
    page.locator("li").filter({ hasText: "Espressomachine" }),
  ).toBeVisible();
});

test("het paneel gaat dicht door de bovenrand omlaag te slepen", async ({
  page,
}) => {
  await register(page, "Sleper", "mob9");
  await createList(page, "Verjaardag");

  await openGiftSheet(page);
  const paneel = page.getByRole("dialog");
  const greep = await paneel.locator("h2").boundingBox();
  expect(greep).not.toBeNull();

  // Van de titelbalk af naar beneden trekken, ruim voorbij de drempel — maar
  // binnen het scherm, anders komen de bewegingen niet aan.
  const hoogte = page.viewportSize()!.height;
  const x = greep!.x + greep!.width / 2;
  const y = greep!.y + greep!.height / 2;
  const eind = Math.min(y + 200, hoogte - 5);
  expect(eind - y).toBeGreaterThan(90);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 40, { steps: 5 });
  await page.mouse.move(x, eind, { steps: 10 });
  await page.mouse.up();

  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("een klein zetje laat het paneel terugveren", async ({ page }) => {
  await register(page, "Terugveren", "mob10");
  await createList(page, "Verjaardag");

  await openGiftSheet(page);
  const paneel = page.getByRole("dialog");
  const greep = await paneel.locator("h2").boundingBox();

  const x = greep!.x + greep!.width / 2;
  const y = greep!.y + greep!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 30, { steps: 5 });
  await page.mouse.up();

  // Onder de drempel: hij hoort gewoon te blijven staan.
  await page.waitForTimeout(400);
  await expect(paneel).toBeVisible();
});

test("naast het paneel tikken sluit het ook", async ({ page }) => {
  await register(page, "Naasttikker", "mob11");
  await createList(page, "Verjaardag");

  await openGiftSheet(page);
  await expect(page.getByRole("dialog")).toBeVisible();

  // Boven het paneel ligt de achtergrond; daarop tikken sluit hem.
  await page.getByRole("button", { name: "Sluiten" }).click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("zonder gekozen lijst kun je niet opslaan", async ({ page }) => {
  await register(page, "Geen lijst", "mob4");
  await createList(page, "Verjaardag");

  await openGiftSheet(page);
  const paneel = page.getByRole("dialog");

  // De lijst waar we in staan uitvinken laat niets over om in op te slaan.
  await paneel.getByRole("button", { name: "Verjaardag" }).click();
  await expect(paneel.getByText("Kies minstens één lijst.")).toBeVisible();

  await paneel.getByRole("button", { name: "Of vul het zelf in" }).click();
  await paneel.getByLabel("Naam", { exact: true }).fill("Iets");
  await expect(
    paneel.getByRole("button", { name: "Cadeau opslaan" }),
  ).toBeDisabled();
});

test("een nieuwe lijst maak je via het plusje bij de kop", async ({ page }) => {
  await register(page, "Lijstmaker", "mob5");

  await page.getByRole("button", { name: "Nieuwe lijst" }).first().click();
  const paneel = page.getByRole("dialog");
  await expect(paneel).toBeVisible();

  await paneel.getByLabel("Naam van de lijst").fill("Sinterklaas");
  await paneel.getByRole("button", { name: "Lijst maken" }).click();

  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);
  await expect(
    page.getByRole("heading", { name: "Sinterklaas" }),
  ).toBeVisible();

  // Het paneel hoort dicht te zijn zodra je ergens anders bent.
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("de knop onderaan een formulier valt niet achter de navigatiebalk", async ({
  page,
}) => {
  await register(page, "Knoppen", "mob6");
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
  await register(page, "Breedte", "mob7");
  await createList(page, "Verjaardag met een behoorlijk lange naam erbij");

  await openGiftSheet(page);
  const paneel = page.getByRole("dialog");
  await paneel.getByRole("button", { name: "Of vul het zelf in" }).click();
  await paneel
    .getByLabel("Naam", { exact: true })
    .fill("Draadloze koptelefoon met actieve ruisonderdrukking en etui");
  await paneel.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const deelLink = await page.locator('input[readonly]').inputValue();

  for (const pad of ["/dashboard", "/account", "/settings", "/lists/new"]) {
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
  await register(page, "Uitlogger", "mob8");

  // Op de telefoon staat er geen uitlogknop in de balk bovenaan; die hoort
  // dus in de instellingen te staan, anders kom je er niet meer uit.
  await page.goto("/settings");
  await page.getByRole("button", { name: "Uitloggen" }).click();
  await page.waitForURL(/\/(login)?$/);
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/);
});
