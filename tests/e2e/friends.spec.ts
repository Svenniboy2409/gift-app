import { expect, test, type Browser } from "@playwright/test";
import {
  acceptInvite,
  createList,
  invitePerson,
  register,
  setVisibility,
} from "./helpers";

/**
 * Vrienden: uitnodigen (opzoeken én via een link), accepteren, en wat dat
 * betekent voor een lijst die op "alleen mijn vrienden" staat.
 */

/** Een eigen venster met een eigen sessie, zodat twee mensen naast elkaar
 * kunnen werken. */
async function persoon(browser: Browser, naam: string, prefix: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await register(page, naam, prefix);

  // De profielnaam wordt van je naam afgeleid en kan een cijfer krijgen als
  // hij al bezet is; lees hem daarom van de pagina zelf.
  await page.goto("/account");
  const profiel = await page
    .getByRole("link", { name: /^@/ })
    .getAttribute("href");
  return { context, page, handle: profiel!.replace("/u/", "") };
}

test("iemand opzoeken, uitnodigen en accepteren", async ({ browser }) => {
  const anna = await persoon(browser, "Anna Vriend", "anna");
  const bram = await persoon(browser, "Bram Vriend", "bram");

  // Anna zoekt Bram op en nodigt hem uit.
  await anna.page.goto("/friends");
  await invitePerson(anna.page, bram.handle);

  // Bram ziet de uitnodiging staan en accepteert.
  await bram.page.goto("/friends");
  await expect(bram.page.getByText("Uitnodigingen voor jou")).toBeVisible();
  await expect(bram.page.getByText("Anna Vriend")).toBeVisible();
  await acceptInvite(bram.page);

  await expect(
    bram.page.getByRole("heading", { name: /Vrienden \(1\)/ }),
  ).toBeVisible();
  await anna.page.reload();
  await expect(
    anna.page.getByRole("heading", { name: /Vrienden \(1\)/ }),
  ).toBeVisible();

  await anna.context.close();
  await bram.context.close();
});

test("via de uitnodigingslink word je ook vrienden", async ({ browser }) => {
  const cas = await persoon(browser, "Cas Link", "cas");
  const dana = await persoon(browser, "Dana Link", "dana");

  await cas.page.goto("/friends");
  const link = await cas.page.locator("input[readonly]").inputValue();
  expect(link).toContain("/i/");

  // Dana opent de link van Cas en stuurt meteen een uitnodiging.
  await dana.page.goto(new URL(link).pathname);
  await expect(dana.page.getByText("Cas Link nodigt je uit")).toBeVisible();
  await dana.page.getByRole("button", { name: "Uitnodigen" }).click();

  // Cas accepteert.
  await cas.page.goto("/friends");
  await acceptInvite(cas.page);
  await expect(
    cas.page.getByRole("heading", { name: /Vrienden \(1\)/ }),
  ).toBeVisible();

  await cas.context.close();
  await dana.context.close();
});

test("een vriendenlijst is alleen voor vrienden te openen", async ({
  browser,
}) => {
  const eva = await persoon(browser, "Eva Lijst", "eva");
  const finn = await persoon(browser, "Finn Lijst", "finn");

  await eva.page.goto("/dashboard");
  await createList(eva.page, "Alleen voor vrienden");
  await setVisibility(eva.page, "Vrienden");
  const deelLink = await eva.page.locator("input[readonly]").inputValue();
  const pad = new URL(deelLink).pathname;

  // Finn is nog geen vriend: de deel-link doet niets voor hem.
  await finn.page.goto(pad);
  await expect(finn.page.getByText("Alleen voor vrienden")).toHaveCount(0);

  // En een bezoeker zonder account al helemaal niet.
  const gast = await browser.newContext();
  const gastPage = await gast.newPage();
  await gastPage.goto(pad);
  await expect(gastPage.getByText("Alleen voor vrienden")).toHaveCount(0);
  await gast.close();

  // Eva nodigt Finn uit, Finn accepteert.
  await eva.page.goto("/friends");
  await invitePerson(eva.page, finn.handle);

  await finn.page.goto("/friends");
  await acceptInvite(finn.page);

  // Nu mag Finn er wel in, en staat de lijst ook op Eva's profiel voor hem.
  await finn.page.goto(pad);
  await expect(
    finn.page.getByRole("heading", { name: "Alleen voor vrienden" }),
  ).toBeVisible();

  await finn.page.goto(`/u/${eva.handle}`);
  await expect(finn.page.getByText("Alleen voor vrienden")).toBeVisible();

  await eva.context.close();
  await finn.context.close();
});
