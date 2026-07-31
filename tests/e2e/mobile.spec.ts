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

/**
 * Chromium op een computer kent het deelvenster van een telefoon niet, dus
 * doen we alsof — en houden we bij wat er gedeeld en wat er gekopieerd wordt.
 */
async function nepDeelvenster(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      gedeeld: { url?: string }[];
      gekopieerd: string[];
      deelMislukt: boolean;
    };
    w.gedeeld = [];
    w.gekopieerd = [];
    w.deelMislukt = false;

    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: { url?: string }) => {
        if (w.deelMislukt) throw new Error("afgebroken");
        w.gedeeld.push(data);
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (tekst: string) => {
          w.gekopieerd.push(tekst);
        },
      },
    });
  });
}

const gedeeld = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { gedeeld: { url?: string }[] }).gedeeld,
  );
const gekopieerd = (page: Page) =>
  page.evaluate(() => (window as unknown as { gekopieerd: string[] }).gekopieerd);

test("delen en kopiëren staan naast elkaar op één regel", async ({ page }) => {
  await nepDeelvenster(page);
  await register(page, "Deler", "mob12");
  await createList(page, "Mijn verjaardag");

  const deelvak = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Deel deze lijst" }) });
  const delen = deelvak.getByRole("button", { name: "Lijst delen" });
  const kopieren = deelvak.getByRole("button", { name: "Link kopiëren" });

  const linksVan = (await delen.boundingBox())!;
  const rechtsVan = (await kopieren.boundingBox())!;

  // Zelfde hoogte, naast elkaar: dus één regel en geen twee.
  expect(Math.abs(linksVan.y - rechtsVan.y)).toBeLessThan(2);
  expect(rechtsVan.x).toBeGreaterThan(linksVan.x + linksVan.width - 2);

  // De balk met de link zelf is uit beeld, maar de link is er nog.
  const veld = deelvak.getByLabel("Deel deze lijst");
  expect((await veld.boundingBox())!.width).toBeLessThan(5);
  expect(await veld.inputValue()).toMatch(/\/l\/[A-Za-z0-9]{10}$/);

  // Een nieuwe link maken hoort nu bij de instellingen van de lijst, en het
  // knopje naar je eigen profiel is weg — daar is het tabblad Account voor.
  await expect(
    deelvak.getByRole("button", { name: "Nieuwe link maken" }),
  ).toHaveCount(0);
  await expect(deelvak.getByRole("link", { name: "Je profiel" })).toHaveCount(0);

  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  const paneel = page.getByRole("dialog");
  await expect(
    paneel.getByRole("heading", { name: "De deel-link" }),
  ).toBeVisible();
  await expect(
    paneel.getByRole("button", { name: "Nieuwe link maken" }),
  ).toBeVisible();
});

test("delen deelt, kopiëren kopieert — en niet allebei tegelijk", async ({
  page,
}) => {
  await nepDeelvenster(page);
  await register(page, "Deler Twee", "mob13");
  await createList(page, "Mijn verjaardag");

  const deelvak = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Deel deze lijst" }) });
  const link = await deelvak.getByLabel("Deel deze lijst").inputValue();

  // Delen opent het deelvenster en laat het klembord met rust.
  await deelvak.getByRole("button", { name: "Lijst delen" }).click();
  expect(await gedeeld(page)).toEqual([
    { title: "Deel deze lijst", url: link },
  ]);
  expect(await gekopieerd(page)).toEqual([]);

  // Breekt iemand het delen af, dan gebeurt er verder niets — vroeger belandde
  // de link dan alsnog op het klembord.
  await page.evaluate(() => {
    (window as unknown as { deelMislukt: boolean }).deelMislukt = true;
  });
  await deelvak.getByRole("button", { name: "Lijst delen" }).click();
  expect(await gekopieerd(page)).toEqual([]);

  // En kopiëren doet alleen dat.
  await deelvak.getByRole("button", { name: "Link kopiëren" }).click();
  await expect(deelvak.getByRole("button", { name: "Gekopieerd!" })).toBeVisible();
  expect(await gekopieerd(page)).toEqual([link]);
  expect(await gedeeld(page)).toHaveLength(1);
});

test("zonder deelvenster blijft alleen kopiëren over", async ({ page }) => {
  // Een computerbrowser zonder Web Share: een deelknop zou daar niets doen.
  await register(page, "Kopieerder", "mob14");
  await createList(page, "Mijn verjaardag");

  const deelvak = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Deel deze lijst" }) });

  await expect(
    deelvak.getByRole("button", { name: "Lijst delen" }),
  ).toHaveCount(0);
  await expect(
    deelvak.getByRole("button", { name: "Link kopiëren" }),
  ).toBeVisible();
});

test("hoe graag je iets wilt schuif je in sterren", async ({ page }) => {
  await register(page, "Sterren", "mob15");
  await createList(page, "Verjaardag");

  await openGiftSheet(page);
  const paneel = page.getByRole("dialog");
  await paneel.getByRole("button", { name: "Of vul het zelf in" }).click();
  await paneel.getByLabel("Naam", { exact: true }).fill("Espressomachine");

  // Vijf sterren, waarvan er standaard drie ingekleurd zijn.
  const schuif = paneel.getByRole("slider", { name: "Hoe graag?" });
  const sterren = paneel.locator("svg.text-accent");
  await expect(schuif).toHaveValue("3");
  await expect(sterren).toHaveCount(3);

  // Verder schuiven kleurt er meer in, terugschuiven minder.
  await schuif.fill("5");
  await expect(sterren).toHaveCount(5);
  await schuif.fill("2");
  await expect(sterren).toHaveCount(2);
  await expect(schuif).toHaveAttribute("aria-valuetext", "2 van de 5 sterren");

  // En de stand komt mee met het formulier.
  await schuif.fill("4");
  await paneel.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const kaart = page.locator("li").filter({ hasText: "Espressomachine" });
  await expect(kaart).toBeVisible();
  // Vier sterren gegeven, dus vier sterren te zien — niet vijf met een doffe.
  await expect(kaart.getByTitle("Hoe graag?")).toHaveText("★★★★");

  // Bij het bewerken staat de schuif weer op vier.
  await kaart.getByRole("button", { name: "Bewerken" }).click();
  await expect(page.getByRole("slider", { name: "Hoe graag?" })).toHaveValue("4");
});

test("na de terugknop staat het paneel niet opeens weer open", async ({
  page,
}) => {
  await register(page, "Terugganger", "mob16");

  // Lijst maken via het paneel; daarna sta je in die lijst.
  await createList(page, "Sinterklaas");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Terug naar het overzicht is terug naar de pagina waar het paneel openstond.
  await page.getByRole("link", { name: "Terug naar mijn lijsten" }).click();
  await page.waitForURL(/\/dashboard$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // En ook via de terugknop van de telefoon blijft het dicht.
  await page.getByText("Sinterklaas").click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);
  await page.goBack();
  await page.waitForURL(/\/dashboard$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("het datumveld blijft binnen het paneel", async ({ page }) => {
  await register(page, "Datum", "mob17");

  await page.getByRole("button", { name: "Nieuwe lijst" }).first().click();
  const paneel = page.getByRole("dialog");
  await expect(paneel).toBeVisible();
  await page.waitForTimeout(400);

  const datum = (await paneel.getByLabel(/^Datum/).boundingBox())!;
  const naam = (await paneel.getByLabel("Naam van de lijst").boundingBox())!;

  // Even breed als de andere velden, en dus ook even ver naar rechts.
  expect(Math.abs(datum.width - naam.width)).toBeLessThan(2);
  expect(datum.x + datum.width).toBeLessThanOrEqual(page.viewportSize()!.width);

  // Chromium houdt een datumveld vanzelf smal genoeg; Safari op iOS niet. Wat
  // dáár misging is dat het veld en zijn kolom mochten meegroeien met de
  // inhoud. Dat leggen we hier vast, zodat het niet stilletjes terugkomt.
  const ruimte = await paneel
    .getByLabel(/^Datum/)
    .evaluate((veld) => [
      getComputedStyle(veld).minWidth,
      getComputedStyle(veld.parentElement!).minWidth,
    ]);
  expect(ruimte).toEqual(["0px", "0px"]);
});

test("de knoppen bij een cadeau passen allemaal op het scherm", async ({
  page,
}) => {
  await register(page, "Knopjes", "mob18");
  await createList(page, "Verjaardag");

  await openGiftSheet(page);
  const invoer = page.getByRole("dialog");
  await invoer.getByRole("button", { name: "Of vul het zelf in" }).click();
  await invoer.getByLabel("Naam", { exact: true }).fill("Espressomachine");
  // Met een winkellink erbij staat er een knop extra; dat is de krapste stand.
  await invoer.getByLabel("Link naar de winkel").fill("https://example.com/x");
  await invoer.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const kaart = page.locator("li").filter({ hasText: "Espressomachine" });
  const breedte = page.viewportSize()!.width;

  for (const naam of [
    "Bewerken",
    "In welke lijsten",
    "Omhoog",
    "Omlaag",
    "Verwijderen",
  ]) {
    const vak = (await kaart.getByRole("button", { name: naam }).boundingBox())!;
    expect(vak, `${naam} ontbreekt`).not.toBeNull();
    expect(vak.x, `${naam} valt links buiten beeld`).toBeGreaterThanOrEqual(0);
    expect(
      vak.x + vak.width,
      `${naam} valt rechts buiten beeld`,
    ).toBeLessThanOrEqual(breedte);
  }

  expect(await scrollsSideways(page)).toBe(false);
});
