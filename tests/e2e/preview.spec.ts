import { expect, test } from "@playwright/test";
import { createList, openManualGiftForm, register } from "./helpers";

/**
 * De eigenaar mag nooit zien wat er al voor hem gekocht is — ook niet door
 * omwegen. "Bekijken zoals bezoekers" laat een voorbeeld zien waarin alles op
 * ongeclaimd staat, en zijn eigen deel-link opent zijn lijst in plaats van de
 * bezoekerskant.
 */

test("het voorbeeld verklapt niet wat er al gekocht is", async ({ browser }) => {
  const eigenaarContext = await browser.newContext();
  const eigenaar = await eigenaarContext.newPage();
  await register(eigenaar, "Jarige Job", "prev1");
  await createList(eigenaar, "Mijn verjaardag");

  const paneel = eigenaar.getByRole("dialog");
  await openManualGiftForm(eigenaar);
  await paneel.getByLabel("Naam", { exact: true }).fill("Espressomachine");
  await paneel.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(
    eigenaar.locator("li").filter({ hasText: "Espressomachine" }),
  ).toBeVisible();

  const deelLink = await eigenaar.getByLabel("Deel deze lijst").inputValue();

  // Een bezoeker koopt het cadeau.
  const bezoekerContext = await browser.newContext();
  const bezoeker = await bezoekerContext.newPage();
  await bezoeker.goto(deelLink);
  await bezoeker.getByRole("button", { name: "Ik koop dit" }).click();
  await bezoeker.getByLabel("Van wie?").fill("Oma en opa");
  await bezoeker.getByRole("button", { name: "Vastleggen" }).click();
  await expect(bezoeker.getByText("Jij koopt dit")).toBeVisible();

  // De eigenaar bekijkt zijn lijst zoals bezoekers hem zien.
  await eigenaar.reload();
  await eigenaar.getByRole("link", { name: "Bekijken zoals bezoekers" }).click();
  await eigenaar.waitForURL(/\/p\/[a-z0-9]+$/);

  await expect(
    eigenaar.getByRole("heading", { name: "Mijn verjaardag" }),
  ).toBeVisible();
  await expect(eigenaar.getByText("Espressomachine")).toBeVisible();

  // Niets van de claim, in de hele pagina niet.
  const html = await eigenaar.content();
  expect(html).not.toContain("Oma en opa");
  expect(html).not.toContain("Gekocht door");

  // En claimen kan hier niet.
  await expect(
    eigenaar.getByRole("button", { name: "Ik koop dit" }),
  ).toBeDisabled();
  await expect(eigenaar.getByText("Voorbeeld", { exact: true })).toBeVisible();

  // Terug naar de lijst zelf.
  await eigenaar.getByRole("link", { name: "Terug naar de lijst" }).click();
  await eigenaar.waitForURL(/\/lists\/[a-z0-9]+$/);

  await eigenaarContext.close();
  await bezoekerContext.close();
});

test("je eigen deel-link opent je lijst, niet de bezoekerskant", async ({
  page,
}) => {
  await register(page, "Eigen Link", "prev2");
  await createList(page, "Mijn verjaardag");
  const lijstPad = new URL(page.url()).pathname;

  const deelLink = await page.getByLabel("Deel deze lijst").inputValue();

  await page.goto(new URL(deelLink).pathname);
  await page.waitForURL(new RegExp(`${lijstPad}$`));

  // De lijstpagina, dus met de instellingen erop — niet de bezoekerskant.
  await expect(
    page.getByRole("button", { name: "Instellingen van de lijst" }),
  ).toBeVisible();
});

test("wie meewerkt aan de lijst komt er ook op uit", async ({ browser }) => {
  const eigenaarContext = await browser.newContext();
  const eigenaar = await eigenaarContext.newPage();
  await register(eigenaar, "Eigenaar Deel", "prev3a");
  await createList(eigenaar, "Samen delen");
  const lijstPad = new URL(eigenaar.url()).pathname;
  const deelLink = await eigenaar.getByLabel("Deel deze lijst").inputValue();

  await eigenaar.getByRole("button", { name: "Instellingen van de lijst" }).click();
  const meedoenLink = await eigenaar
    .getByRole("dialog")
    .getByLabel("Uitnodigingslink voor deze lijst")
    .inputValue();

  const helperContext = await browser.newContext();
  const helper = await helperContext.newPage();
  await register(helper, "Helper Deel", "prev3b");

  // Iemand die nog niet meedoet ziet gewoon de bezoekerskant.
  await helper.goto(new URL(deelLink).pathname);
  await expect(
    helper.getByRole("button", { name: "Ik koop dit" }),
  ).toHaveCount(0);
  await expect(helper.getByText("Verlanglijstje van")).toBeVisible();

  await helper.goto(new URL(meedoenLink).pathname);
  await helper.getByRole("button", { name: "Meedoen" }).click();
  await helper.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);

  // Nu hij meedoet, brengt de deel-link hem naar de lijst zelf.
  await helper.goto(new URL(deelLink).pathname);
  await helper.waitForURL(new RegExp(`${lijstPad}$`));

  await eigenaarContext.close();
  await helperContext.close();
});
