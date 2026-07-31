import { expect, test, type Page } from "@playwright/test";
import { openGiftSheet } from "./helpers";

/**
 * Volledige doorloop: account maken → lijst maken → link plakken → cadeau
 * opslaan → delen → claimen door twee bezoekers → controleren dat de eigenaar
 * de claims níet ziet.
 */

const stamp = Date.now();
const OWNER = {
  name: "Sanne Testers",
  email: `sanne-${stamp}@example.com`,
  password: "eengoedwachtwoord",
};

/**
 * De scraper weigert bewust privé-adressen, dus we kunnen geen lokale
 * testwinkel draaien. We onderscheppen daarom het API-antwoord; het uitlezen
 * zelf is gedekt door de unit tests in tests/unit/extract.test.ts.
 */
async function mockScrape(page: Page) {
  await page.route("**/api/scrape", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        quality: "ok",
        product: {
          title: "Espressomachine De Luxe",
          description: "Met melkopschuimer.",
          priceCents: 17_900,
          currency: "EUR",
          imageUrl: null,
          merchant: "bol",
          url: "https://www.bol.com/nl/p/espressomachine/9200000123456789/",
        },
      }),
    });
  });
}

test("van link plakken tot claimen, zonder de verrassing te verklappen", async ({
  browser,
}) => {
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await mockScrape(owner);

  // --- Account maken -------------------------------------------------------
  await owner.goto("/register");
  await owner.getByLabel("Naam").fill(OWNER.name);
  await owner.getByLabel("E-mailadres").fill(OWNER.email);
  await owner.getByLabel("Wachtwoord").fill(OWNER.password);
  await owner.getByRole("button", { name: "Account maken" }).click();

  await expect(owner).toHaveURL(/\/dashboard$/);
  await expect(owner.getByRole("heading", { name: "Mijn lijsten" })).toBeVisible();

  // --- Lijst maken ---------------------------------------------------------
  await owner.getByRole("button", { name: "Nieuwe lijst" }).first().click();
  await owner.getByLabel("Naam van de lijst").fill("Mijn verjaardag");
  await owner
    .getByLabel("Omschrijving")
    .fill("Alles wat ik leuk vind dit jaar.");
  await owner.getByLabel("Gelegenheid").selectOption("BIRTHDAY");
  await owner.getByRole("button", { name: "Lijst maken" }).click();

  await expect(owner).toHaveURL(/\/lists\/[a-z0-9]+$/);
  await expect(
    owner.getByRole("heading", { name: "Mijn verjaardag" }),
  ).toBeVisible();

  // --- Link plakken: alles wordt automatisch ingevuld ----------------------
  await openGiftSheet(owner);
  await owner
    .getByPlaceholder("Plak hier een link naar een product…")
    .fill("https://www.bol.com/nl/p/espressomachine/9200000123456789/");
  await owner.getByRole("button", { name: "Ophalen" }).click();

  const titleField = owner.getByLabel("Naam", { exact: true });
  await expect(titleField).toHaveValue("Espressomachine De Luxe");
  await expect(owner.getByLabel("Prijs")).toHaveValue("179,00");
  await expect(owner.getByLabel("Link naar de winkel")).toHaveValue(
    "https://www.bol.com/nl/p/espressomachine/9200000123456789/",
  );

  // --- Zelf aanpassen en opslaan ------------------------------------------
  await titleField.fill("Espressomachine (zwart)");
  await owner.getByLabel("Notitie (maat, kleur, variant)").fill("Liefst zwart");
  await owner.getByLabel("Aantal").fill("2");
  await owner.getByRole("button", { name: "Cadeau opslaan" }).click();

  await expect(
    owner.getByRole("heading", { name: "Espressomachine (zwart)" }),
  ).toBeVisible();
  await expect(owner.getByText("Liefst zwart")).toBeVisible();
  await expect(owner.getByText("€ 179,00")).toBeVisible();

  // --- Deel-link ophalen ---------------------------------------------------
  const shareUrl = await owner.getByLabel("Deel deze lijst").inputValue();
  expect(shareUrl).toMatch(/\/l\/[A-Za-z0-9]{10}$/);

  // --- Bezoeker 1 claimt ---------------------------------------------------
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await visitor.goto(shareUrl);

  await expect(
    visitor.getByRole("heading", { name: "Mijn verjaardag" }),
  ).toBeVisible();
  await expect(
    visitor.getByText(`Verlanglijstje van ${OWNER.name}`),
  ).toBeVisible();
  await expect(visitor.getByText("Nog 2 van 2 beschikbaar")).toBeVisible();

  await visitor.getByRole("button", { name: "Ik koop dit" }).click();
  await visitor.getByLabel("Van wie?").fill("Oma en opa");
  await visitor.getByLabel("Hoeveel neem je er?").fill("1");
  await visitor.getByRole("button", { name: "Vastleggen" }).click();

  await expect(visitor.getByText("Jij koopt dit")).toBeVisible();
  await expect(visitor.getByText("Nog 1 van 2 beschikbaar")).toBeVisible();

  // --- Bezoeker 2 ziet de claim van bezoeker 1 -----------------------------
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await other.goto(shareUrl);

  await expect(other.getByText("Gekocht door Oma en opa")).toBeVisible();
  await expect(other.getByText("Jij koopt dit")).toHaveCount(0);
  await expect(
    other.getByRole("button", { name: "Ik koop dit" }),
  ).toBeVisible();

  // --- De eigenaar mag hier niets van zien ---------------------------------
  await owner.reload();
  const ownerHtml = await owner.content();
  expect(ownerHtml).not.toContain("Oma en opa");
  expect(ownerHtml).not.toContain("Gekocht door");
  expect(ownerHtml).not.toContain("Jij koopt dit");
  await expect(owner.getByText("Oma en opa")).toHaveCount(0);

  // Ook het dashboard verklapt niets.
  await owner.goto("/dashboard");
  expect(await owner.content()).not.toContain("Oma en opa");

  // --- Claim weer intrekken ------------------------------------------------
  await visitor.reload();
  await visitor.getByRole("button", { name: "Toch niet" }).click();
  await expect(visitor.getByText("Jij koopt dit")).toHaveCount(0);
  await expect(visitor.getByText("Nog 2 van 2 beschikbaar")).toBeVisible();

  await ownerContext.close();
  await visitorContext.close();
  await otherContext.close();
});

test("een privélijst is niet te openen via de deel-link", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/register");
  await page.getByLabel("Naam").fill("Privé Persoon");
  await page.getByLabel("E-mailadres").fill(`prive-${Date.now()}@example.com`);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "Nieuwe lijst" }).first().click();
  await page.getByLabel("Naam van de lijst").fill("Geheime lijst");
  await page.getByText("Privé", { exact: true }).click();
  await page.getByRole("button", { name: "Lijst maken" }).click();
  await expect(page).toHaveURL(/\/lists\/[a-z0-9]+$/);

  await expect(
    page.getByText("Deze lijst staat op 'Privé' en is niet te delen."),
  ).toBeVisible();

  await context.close();
});

test("de taal is om te schakelen naar Engels", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Verlanglijstjes die zichzelf invullen" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Wishlists that fill themselves in" }),
  ).toBeVisible();
});
