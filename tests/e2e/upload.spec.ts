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

test("een grote telefoonfoto wordt verkleind in plaats van geweigerd", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Naam").fill("Grote Foto");
  await page.getByLabel("E-mailadres").fill(`up3-${Date.now()}@example.com`);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Nieuwe lijst" }).first().click();
  await page.getByLabel("Naam van de lijst").fill("Grote fotos");
  await page.getByRole("button", { name: "Lijst maken" }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);

  await page.getByRole("button", { name: "Of vul het zelf in" }).click();
  await page.getByLabel("Naam", { exact: true }).fill("Grote foto");

  // Een echte foto van 3000x3000 met ruis, zodat hij niet weg te comprimeren
  // is — vergelijkbaar met wat een telefooncamera oplevert.
  const origineleGrootte = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 3000;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.createImageData(3000, 3000);
    for (let i = 0; i < data.data.length; i += 4) {
      data.data[i] = Math.random() * 255;
      data.data[i + 1] = Math.random() * 255;
      data.data[i + 2] = Math.random() * 255;
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 1),
    );
    const file = new File([blob], "telefoon.jpg", { type: "image/jpeg" });

    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return blob.size;
  });

  // De bronfoto is fors: ruim boven wat we willen opslaan.
  expect(origineleGrootte).toBeGreaterThan(2 * 1024 * 1024);

  // Geen foutmelding, maar gewoon een voorvertoning.
  const voorvertoning = page.locator("form img").first();
  await expect(voorvertoning).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/te groot/i)).toHaveCount(0);

  // En wat er is opgeslagen is een stuk kleiner dan het origineel.
  const bron = await voorvertoning.getAttribute("src");
  const opgeslagenGrootte = await page.evaluate(async (url) => {
    const res = await fetch(url!);
    return (await res.blob()).size;
  }, bron);

  expect(opgeslagenGrootte).toBeLessThan(600 * 1024);
  expect(opgeslagenGrootte).toBeLessThan(origineleGrootte / 2);

  await page.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(
    page.locator("li").filter({ hasText: "Grote foto" }).locator("img"),
  ).toBeVisible();
});

test("een HEIC die niet omgezet kan worden krijgt een eigen uitleg", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Naam").fill("Heic Foto");
  await page.getByLabel("E-mailadres").fill(`up4-${Date.now()}@example.com`);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Nieuwe lijst" }).first().click();
  await page.getByLabel("Naam van de lijst").fill("Heic");
  await page.getByRole("button", { name: "Lijst maken" }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);

  await page.getByRole("button", { name: "Of vul het zelf in" }).click();

  // Een HEIC-kop: precies wat een iPhone uit de galerij meestuurt. Chromium
  // kan dat niet lezen, dus hij komt ongewijzigd bij de server aan — en daar
  // hoort dan de uitleg over HEIC te volgen, niet "er ging iets mis".
  const heic = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from("ftypheic"),
    Buffer.alloc(2048),
  ]);
  await page.locator('input[type="file"]').setInputFiles({
    name: "IMG_0001.HEIC",
    mimeType: "image/heic",
    buffer: heic,
  });

  await expect(page.getByText(/HEIC-formaat/i)).toBeVisible({ timeout: 15_000 });
});

test("een onleesbaar bestand wordt geweigerd met uitleg", async ({ page }) => {
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

  // Geen leesbare afbeelding: de browser kan hem dus niet verkleinen, en dan
  // moet het vangnet op de server hem weigeren met een begrijpelijke melding.
  await page.locator('input[type="file"]').setInputFiles({
    name: "kapot.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(5 * 1024 * 1024, 7),
  });

  await expect(page.getByText(/te groot/i)).toBeVisible({ timeout: 15_000 });
});
