import type { Page } from "@playwright/test";

/**
 * Handelingen die in bijna elke test terugkomen. Toevoegen gaat sinds het
 * schuifpaneel via een knop die op een telefoon ergens anders staat dan op een
 * breed scherm; dat verschil vangen we hier op.
 */

export async function register(page: Page, naam: string, prefix = "e2e") {
  await page.goto("/register");
  await page.getByLabel("Naam").fill(naam);
  await page.getByLabel("E-mailadres").fill(`${prefix}-${Date.now()}@example.com`);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).click();
  await page.waitForURL(/\/dashboard$/);
}

/** Maakt een lijst via het schuifpaneel en wacht tot je erin staat. */
export async function createList(page: Page, titel: string) {
  await page.getByRole("button", { name: "Nieuwe lijst" }).first().click();
  await page.getByLabel("Naam van de lijst").fill(titel);
  await page.getByRole("button", { name: "Lijst maken" }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);
}

/** Opent het paneel om een cadeau toe te voegen. */
export async function openGiftSheet(page: Page) {
  const tab = page.locator(".tabbar-action");
  if (await tab.isVisible()) {
    await tab.click();
  } else {
    await page.getByRole("button", { name: "Cadeau toevoegen" }).first().click();
  }
  await page.getByRole("dialog").waitFor();
  // Het paneel schuift omhoog; meten of slepen heeft pas zin als het stilstaat.
  await page.waitForTimeout(400);
}

/** Opent het paneel en kiest meteen voor zelf invullen. */
export async function openManualGiftForm(page: Page) {
  await openGiftSheet(page);
  await page.getByRole("button", { name: "Of vul het zelf in" }).click();
}
