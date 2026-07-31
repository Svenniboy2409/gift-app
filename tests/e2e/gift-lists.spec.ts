import { expect, test, type Page } from "@playwright/test";
import { createList, openManualGiftForm, register } from "./helpers";

/**
 * Hetzelfde cadeau in meerdere lijsten. Vanuit de lijst zelf kies je waar het
 * hoort te staan; wat je aanvinkt komt erbij, wat je uitvinkt verdwijnt daar.
 */

/** Opent het paneel "In welke lijsten" bij het cadeau met deze naam. */
async function openLijstenPaneel(page: Page, naam: string) {
  await page
    .locator("li")
    .filter({ hasText: naam })
    .getByRole("button", { name: "In welke lijsten" })
    .click();
  const paneel = page.getByRole("dialog");
  await paneel.waitFor();
  await page.waitForTimeout(400);
  return paneel;
}

/** Gaat naar de lijst met deze naam via het overzicht. */
async function openLijst(page: Page, naam: string) {
  await page.goto("/dashboard");
  await page.getByText(naam, { exact: true }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);
}

test("een cadeau erbij zetten in een andere lijst, en er weer uit", async ({
  page,
}) => {
  await register(page, "Verdeler", "gl1");
  await createList(page, "Verjaardag");
  await page.goto("/dashboard");
  await createList(page, "Kerst");

  // Cadeau alleen in Kerst, want daar staan we.
  await openManualGiftForm(page);
  const invoer = page.getByRole("dialog");
  await invoer.getByLabel("Naam", { exact: true }).fill("Espressomachine");
  await invoer.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Het paneel opent met alleen de lijst waar het cadeau in staat aangevinkt.
  let paneel = await openLijstenPaneel(page, "Espressomachine");
  await expect(paneel.getByRole("button", { name: "Kerst" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    paneel.getByRole("button", { name: "Verjaardag" }),
  ).toHaveAttribute("aria-pressed", "false");

  // Verjaardag erbij.
  await paneel.getByRole("button", { name: "Verjaardag" }).click();
  await paneel.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Nu staat hij in allebei.
  await openLijst(page, "Verjaardag");
  await expect(
    page.locator("li").filter({ hasText: "Espressomachine" }),
  ).toBeVisible();

  // En vanuit Verjaardag halen we Kerst er weer af.
  paneel = await openLijstenPaneel(page, "Espressomachine");
  await expect(paneel.getByRole("button", { name: "Kerst" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await paneel.getByRole("button", { name: "Kerst" }).click();
  await paneel.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Weg uit Kerst, nog steeds in Verjaardag.
  await openLijst(page, "Kerst");
  await expect(
    page.locator("li").filter({ hasText: "Espressomachine" }),
  ).toHaveCount(0);

  await openLijst(page, "Verjaardag");
  await expect(
    page.locator("li").filter({ hasText: "Espressomachine" }),
  ).toBeVisible();
});

test("alle lijsten uitvinken kan niet", async ({ page }) => {
  await register(page, "Nergens", "gl2");
  await createList(page, "Verjaardag");

  await openManualGiftForm(page);
  const invoer = page.getByRole("dialog");
  await invoer.getByLabel("Naam", { exact: true }).fill("Fondueset");
  await invoer.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const paneel = await openLijstenPaneel(page, "Fondueset");
  await paneel.getByRole("button", { name: "Verjaardag" }).click();

  // Zonder lijst valt er niets op te slaan; verwijderen doe je met de
  // prullenbak, niet hier.
  await expect(paneel.getByText("Kies minstens één lijst.")).toBeVisible();
  await expect(
    paneel.getByRole("button", { name: "Opslaan" }),
  ).toBeDisabled();
});

test("een cadeau in twee lijsten weet dat ook na het toevoegen", async ({
  page,
}) => {
  await register(page, "Tweemaal", "gl3");
  await createList(page, "Verjaardag");
  await page.goto("/dashboard");
  await createList(page, "Kerst");

  // Meteen in allebei toevoegen via het toevoegscherm.
  await openManualGiftForm(page);
  const invoer = page.getByRole("dialog");
  await invoer.getByRole("button", { name: "Verjaardag" }).click();
  await invoer.getByLabel("Naam", { exact: true }).fill("Wandelschoenen");
  await invoer.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Het paneel hoort beide lijsten aangevinkt te tonen.
  const paneel = await openLijstenPaneel(page, "Wandelschoenen");
  await expect(paneel.getByRole("button", { name: "Kerst" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    paneel.getByRole("button", { name: "Verjaardag" }),
  ).toHaveAttribute("aria-pressed", "true");
});
