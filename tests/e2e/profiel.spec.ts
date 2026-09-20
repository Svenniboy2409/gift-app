import { expect, test, type Page } from "@playwright/test";
import { createList, register, setVisibility } from "./helpers";

/**
 * Wat een bezoeker met de maker van een lijst kan: zijn profiel bekijken, en
 * vrienden worden.
 */

/** Maakt een openbare lijst en geeft de deel-link en de profielnaam terug. */
async function openbareLijst(page: Page, naam: string, prefix: string) {
  await register(page, naam, prefix);
  await createList(page, `Lijst van ${naam}`);
  await setVisibility(page, "Openbaar");
  const link = await page.locator("input[readonly]").first().inputValue();
  await page.goto("/account");
  const handle = (await page.getByText(/^@/).first().innerText()).slice(1);
  return { link: new URL(link).pathname, handle };
}

test("vanaf een gedeelde lijst kom je op het profiel van de maker", async ({
  page,
}) => {
  const { link, handle } = await openbareLijst(page, "Sanne Bakker", "prof");

  // Kijken zoals iemand die alleen de link heeft.
  await page.context().clearCookies();
  await page.goto(link);

  await page.getByRole("link", { name: /Sanne Bakker/ }).click();
  await page.waitForURL(new RegExp(`/u/${handle}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: /Sanne Bakker/ }),
  ).toBeVisible();
  // Zijn openbare lijsten staan erbij.
  await expect(page.getByText("Lijst van Sanne Bakker")).toBeVisible();
});

test("zonder account vraagt het vriendschapsknopje eerst om in te loggen", async ({
  page,
}) => {
  const { handle } = await openbareLijst(page, "Sanne Bakker", "prof");
  await page.context().clearCookies();
  await page.goto(`/u/${handle}`);

  const knop = page.getByRole("button", { name: /Vriendschapsverzoek/ });
  await expect(knop).toBeEnabled();

  // Eerst annuleren: dan blijf je gewoon waar je bent.
  page.once("dialog", (venster) => venster.dismiss());
  await knop.click();
  await page.waitForTimeout(300);
  expect(new URL(page.url()).pathname).toBe(`/u/${handle}`);

  // En anders ga je naar het inlogscherm, dat je daarna terugbrengt.
  page.once("dialog", (venster) => venster.accept());
  await knop.click();
  await page.waitForURL(/\/login/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(`/u/${handle}`);
});

test("ingelogd stuur je een verzoek, en daarna staat er een vinkje", async ({
  browser,
}) => {
  const eigenaar = await browser.newPage();
  const { handle } = await openbareLijst(eigenaar, "Sanne Bakker", "prof");

  const bezoeker = await browser.newPage();
  await register(bezoeker, "Tim Jansen", "prof");
  await bezoeker.goto(`/u/${handle}`);

  const knop = bezoeker.getByRole("button", { name: /Vriendschapsverzoek/ });
  bezoeker.once("dialog", async (venster) => {
    expect(venster.message()).toContain("Sanne Bakker");
    await venster.accept();
  });
  await knop.click();

  // Verstuurd: nu wacht je op antwoord en valt er niets meer te tikken.
  const wachten = bezoeker.getByRole("button", { name: "Wacht op antwoord" });
  await expect(wachten).toBeVisible();
  await expect(wachten).toBeDisabled();

  // De ander accepteert.
  await eigenaar.goto("/friends");
  await eigenaar.getByRole("button", { name: "Accepteren" }).first().click();
  await expect(eigenaar.getByText("Tim Jansen")).toBeVisible();

  // Nu zijn jullie vrienden: het knopje zegt dat, en doet verder niets.
  await bezoeker.reload();
  const vrienden = bezoeker.getByRole("button", { name: "Jullie zijn vrienden" });
  await expect(vrienden).toBeVisible();
  await expect(vrienden).toBeDisabled();

  await eigenaar.close();
  await bezoeker.close();
});

test("als vriend zie je op het profiel ook de vriendenlijsten", async ({
  browser,
}) => {
  const eigenaar = await browser.newPage();
  await register(eigenaar, "Sanne Bakker", "prof");
  await createList(eigenaar, "Alleen voor vrienden");
  await setVisibility(eigenaar, "Vrienden");
  await eigenaar.goto("/account");
  const handle = (await eigenaar.getByText(/^@/).first().innerText()).slice(1);

  // Een vreemde ziet hem niet.
  const bezoeker = await browser.newPage();
  await bezoeker.goto(`/u/${handle}`);
  await expect(bezoeker.getByText("Alleen voor vrienden")).toHaveCount(0);

  // Na vrienden worden wel.
  await register(bezoeker, "Tim Jansen", "prof");
  await bezoeker.goto(`/u/${handle}`);
  bezoeker.once("dialog", (venster) => venster.accept());
  await bezoeker.getByRole("button", { name: /Vriendschapsverzoek/ }).click();
  await expect(
    bezoeker.getByRole("button", { name: "Wacht op antwoord" }),
  ).toBeVisible();

  await eigenaar.goto("/friends");
  await eigenaar.getByRole("button", { name: "Accepteren" }).first().click();
  await expect(eigenaar.getByText("Tim Jansen")).toBeVisible();

  await bezoeker.goto(`/u/${handle}`);
  await expect(bezoeker.getByText("Alleen voor vrienden")).toBeVisible();

  await eigenaar.close();
  await bezoeker.close();
});
