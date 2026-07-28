import { expect, test } from "@playwright/test";

/**
 * De uploadknop van begin tot eind: bestand kiezen, opslaan, en controleren dat
 * de foto daarna echt bij het cadeau in de lijst staat.
 *
 * Lokaal schrijft de app naar public/uploads; op Vercel gaat dezelfde route
 * naar Vercel Blob zodra BLOB_READ_WRITE_TOKEN gezet is. Alleen die ene tak
 * verschilt, de rest van de weg is hier gedekt.
 */

// Een geldige 1×1 PNG, groot genoeg om niet als placeholder te gelden.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const PADDED = Buffer.concat([PNG, Buffer.alloc(4096)]);

test("een eigen foto uploaden en terugzien bij het cadeau", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Naam").fill("Foto Uploader");
  await page.getByLabel("E-mailadres").fill(`up-${Date.now()}@example.com`);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Nieuwe lijst" }).first().click();
  await page.getByLabel("Naam van de lijst").fill("Zelfgemaakt");
  await page.getByRole("button", { name: "Lijst maken" }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);

  await page.getByRole("button", { name: "Of vul het zelf in" }).click();
  await page.getByLabel("Naam", { exact: true }).fill("Zelfgemaakte taart");

  // Het bestandsveld zit verstopt achter de knop "Eigen foto kiezen".
  await page.locator('input[type="file"]').setInputFiles({
    name: "taart.png",
    mimeType: "image/png",
    buffer: PADDED,
  });

  // Zodra de upload klaar is verschijnt de voorvertoning.
  const voorvertoning = page.locator("form img").first();
  await expect(voorvertoning).toBeVisible({ timeout: 15_000 });
  const bron = await voorvertoning.getAttribute("src");
  expect(bron).toBeTruthy();

  await page.getByRole("button", { name: "Cadeau opslaan" }).click();

  // En de foto hoort bij het cadeau in de lijst te staan.
  const kaart = page.locator("li").filter({ hasText: "Zelfgemaakte taart" });
  await expect(kaart).toBeVisible();
  await expect(kaart.locator("img")).toBeVisible();
});

test("een te groot bestand wordt geweigerd met uitleg", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Naam").fill("Grote Foto");
  await page.getByLabel("E-mailadres").fill(`up2-${Date.now()}@example.com`);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Nieuwe lijst" }).first().click();
  await page.getByLabel("Naam van de lijst").fill("Test");
  await page.getByRole("button", { name: "Lijst maken" }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);

  await page.getByRole("button", { name: "Of vul het zelf in" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "enorm.png",
    mimeType: "image/png",
    buffer: Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]),
  });

  await expect(page.getByText(/te groot/i)).toBeVisible({ timeout: 15_000 });
});
