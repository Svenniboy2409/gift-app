import { expect, test } from "@playwright/test";
import { createList, register } from "./helpers";

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
