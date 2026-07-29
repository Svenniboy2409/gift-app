import { expect, test } from "@playwright/test";
import { confirmCrop, createList, register } from "./helpers";

/**
 * Het accounttabblad: je eigen profiel zoals anderen het zien, met de lijsten
 * die je níét deelt eronder weggeklapt. En wat je hier invult — foto, bio —
 * hoort op je openbare profiel terug te komen.
 */

// Een geldige PNG, groot genoeg om niet als placeholder te gelden.
const PNG = Buffer.concat([
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
  Buffer.alloc(4096),
]);

test("je account toont je profiel, met de verborgen lijsten weggeklapt", async ({
  page,
}) => {
  await register(page, "Sven Tester", "acc");

  // Eén lijst op het profiel, één die er juist niet op hoort.
  await createList(page, "Mijn verjaardag");
  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  await page.getByText("Ook op mijn profiel", { exact: true }).click();
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByText("Opgeslagen.")).toBeVisible();

  await page.goto("/dashboard");
  await createList(page, "Geheime lijst");

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Sven Tester" })).toBeVisible();
  // De profielnaam wordt afgeleid van je naam; bij een tweede testronde krijgt
  // hij er een cijfer achter, dus we kijken naar het begin.
  await expect(page.getByText(/^@sven-tester/)).toBeVisible();

  // De openbare lijst staat er meteen; de andere zit achter het uitklapvak.
  await expect(page.getByRole("heading", { name: "Mijn verjaardag" })).toBeVisible();
  await expect(page.getByText("Geheime lijst")).toHaveCount(0);

  await page.getByRole("button", { name: /Verborgen lijsten/ }).click();
  await expect(page.getByText("Geheime lijst")).toBeVisible();
});

test("foto en bio komen op je openbare profiel te staan", async ({ page }) => {
  await register(page, "Bio Persoon", "bio");
  await createList(page, "Kerst");
  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  await page.getByText("Ook op mijn profiel", { exact: true }).click();
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByText("Opgeslagen.")).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Over jou").fill("Houdt van koken en te veel koffie.");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "ik.png",
    mimeType: "image/png",
    buffer: PNG,
  });

  // Een profielfoto snijd je eerst bij; die moet vierkant zijn.
  await confirmCrop(page);

  // Wachten tot de upload klaar is: dan staat de foto in het formulier.
  const voorvertoning = page.locator("form img").first();
  await expect(voorvertoning).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Opslaan" }).first().click();
  await expect(page.getByText("Opgeslagen.")).toBeVisible();

  // Op je account zie je hem terug…
  await page.goto("/account");
  await expect(page.getByText("Houdt van koken")).toBeVisible();
  await expect(page.locator("main img").first()).toBeVisible();

  // …en een bezoeker zonder account ook.
  const profiel = await page
    .getByRole("link", { name: /^@bio-persoon/ })
    .getAttribute("href");
  expect(profiel).toBeTruthy();

  await page.context().clearCookies();
  await page.goto(profiel!);
  await expect(page.getByText("Houdt van koken")).toBeVisible();
  await expect(page.getByText("Kerst")).toBeVisible();
});

test("een profielfoto wordt altijd vierkant opgeslagen", async ({ page }) => {
  await register(page, "Vierkant", "sq");
  await page.goto("/settings");

  // Een liggende foto van 600 bij 300: die kán niet zomaar vierkant zijn.
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#c4633c";
    ctx.fillRect(0, 0, 600, 300);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(20, 20, 100, 100);

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png"),
    );
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], "breed.png", { type: "image/png" }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await confirmCrop(page);

  // Het verborgen veld houdt het uiteindelijke adres vast; dat is preciezer
  // dan de eerste de beste afbeelding op het scherm.
  const veld = page.locator('input[name="avatarUrl"]');
  await expect
    .poll(() => veld.inputValue(), { timeout: 15_000 })
    .not.toBe("");
  const bron = await veld.inputValue();

  const maten = await page.evaluate(
    (url) =>
      new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error("kan de foto niet laden"));
        img.src = url!;
      }),
    bron,
  );

  // Afrondingsverschil van één beeldpunt mag; scheef zijn niet.
  expect(Math.abs(maten.w - maten.h)).toBeLessThanOrEqual(1);
  expect(maten.w).toBeLessThan(600);
});
