import { expect, test } from "@playwright/test";
import { buildBookmarklet } from "../../lib/bookmarklet";

/**
 * De bewaarknop draait in de browser van de gebruiker, op de productpagina
 * zelf. Die kunnen we hier echt nabootsen: we serveren een nagemaakte
 * webshoppagina, voeren de bookmarklet-code daarop uit en controleren welke
 * gegevens er in de app terechtkomen.
 */

const SHOP_PAGE = `<!doctype html>
<html><head>
  <title>Lattafa Khamrah EDP 100ml - Testwinkel</title>
  <meta property="og:site_name" content="Testwinkel">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Product",
   "name":"Lattafa Khamrah Eau de Parfum 100ml",
   "image":"https://media.example.com/khamrah.jpg",
   "offers":{"@type":"Offer","price":"34.95","priceCurrency":"EUR"}}
  </script>
</head><body><h1>Lattafa Khamrah</h1><p>€ 34,95</p></body></html>`;

test("de bewaarknop leest een productpagina uit en vult het formulier", async ({
  page,
  baseURL,
}) => {
  // Account en lijst klaarzetten.
  await page.goto("/register");
  await page.getByLabel("Naam").fill("Bladwijzer Tester");
  await page.getByLabel("E-mailadres").fill(`bm-${Date.now()}@example.com`);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Nieuwe lijst" }).first().click();
  await page.getByLabel("Naam van de lijst").fill("Mijn verlanglijst");
  await page.getByRole("button", { name: "Lijst maken" }).click();
  await page.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);

  // Een nagemaakte webshop op een ander domein dan de app.
  await page.route("https://webshop.test/product", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: SHOP_PAGE }),
  );
  await page.goto("https://webshop.test/product");

  // De bookmarklet uitvoeren zoals de browser dat doet: de code achter
  // "javascript:" decoderen en op de pagina evalueren.
  const bookmarklet = buildBookmarklet(baseURL!);
  const target = await page.evaluate((code) => {
    const source = decodeURIComponent(code.replace(/^javascript:/, ""));
    let opened = "";
    // window.open onderscheppen zodat we zien waar hij heen zou gaan.
    (window as unknown as { open: (u: string) => null }).open = (u: string) => {
      opened = u;
      return null;
    };
    eval(source);
    return opened;
  }, bookmarklet);

  expect(target).toContain("/add?");

  // Wat de knop heeft doorgegeven.
  const params = new URL(target).searchParams;
  expect(params.get("title")).toBe("Lattafa Khamrah Eau de Parfum 100ml");
  expect(params.get("price")).toBe("34.95");
  expect(params.get("currency")).toBe("EUR");
  expect(params.get("image")).toBe("https://media.example.com/khamrah.jpg");
  expect(params.get("url")).toBe("https://webshop.test/product");

  // En dan het scherm waar je op uitkomt.
  await page.goto(target);
  await expect(page.getByLabel("Naam", { exact: true })).toHaveValue(
    "Lattafa Khamrah Eau de Parfum 100ml",
  );
  await expect(page.getByLabel("Prijs")).toHaveValue("34.95");
  await expect(page.getByLabel("In welke lijst?")).toHaveValue(/.+/);

  await page.getByRole("button", { name: "Cadeau opslaan" }).click();
  await expect(page.getByText("Toegevoegd!")).toBeVisible();

  // Staat het er echt in?
  await page.goto("/dashboard");
  await page.getByText("Mijn verlanglijst").click();
  await expect(
    page.getByRole("heading", { name: "Lattafa Khamrah Eau de Parfum 100ml" }),
  ).toBeVisible();
  await expect(page.getByText("€ 34,95")).toBeVisible();
});

test("zonder lijst vraagt de bewaarknop er eerst om er een te maken", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Naam").fill("Geen Lijsten");
  await page.getByLabel("E-mailadres").fill(`bm2-${Date.now()}@example.com`);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.goto("/add?title=Iets%20leuks&url=https%3A%2F%2Fwebshop.test%2Fx");
  await expect(page.getByText("Maak eerst een lijst aan")).toBeVisible();
});

test("uitgelogd kom je na inloggen terug bij het bewaarscherm", async ({
  browser,
}) => {
  // Eerst een account met een lijst, in een aparte context.
  const setup = await browser.newContext();
  const first = await setup.newPage();
  const email = `bm3-${Date.now()}@example.com`;
  await first.goto("/register");
  await first.getByLabel("Naam").fill("Terugkeer Tester");
  await first.getByLabel("E-mailadres").fill(email);
  await first.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await first.getByRole("button", { name: "Account maken" }).click();
  await first.waitForURL(/\/dashboard$/);
  await first.getByRole("link", { name: "Nieuwe lijst" }).first().click();
  await first.getByLabel("Naam van de lijst").fill("Kerst");
  await first.getByRole("button", { name: "Lijst maken" }).click();
  await first.waitForURL(/\/lists\/(?!new)[a-z0-9]+$/);
  await setup.close();

  // Nu als uitgelogde bezoeker de bewaarknop gebruiken.
  const fresh = await browser.newContext();
  const page = await fresh.newPage();
  await page.goto("/add?title=Warme%20trui&price=29%2C95&url=https%3A%2F%2Fwebshop.test%2Ftrui");

  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByLabel("Wachtwoord").fill("eengoedwachtwoord");
  await page.getByRole("button", { name: "Inloggen" }).click();

  // Terug bij het bewaarscherm, met de gegevens nog intact.
  await expect(page).toHaveURL(/\/add\?/);
  await expect(page.getByLabel("Naam", { exact: true })).toHaveValue("Warme trui");
  await expect(page.getByLabel("Prijs")).toHaveValue("29,95");
  await fresh.close();
});

/**
 * Een productpagina zoals bol.com hem serveert: het hoofdproduct plus een rij
 * aanbevelingen, allemaal als los JSON-LD-blok. Het hoofdproduct staat hier
 * bewust zónder afbeelding in zijn eigen blok, want dat is precies het geval
 * waarin de foto van een aanbevolen product werd overgenomen.
 */
const SHOP_WITH_RECOMMENDATIONS = `<!doctype html>
<html><head>
  <title>Lattafa Khamrah - Testwinkel</title>
  <meta property="og:image" content="https://media.example.com/HOOFDPRODUCT.jpg">
  <script type="application/ld+json">
  {"@type":"Product","name":"Lattafa Khamrah Eau de Parfum 100ml",
   "offers":{"@type":"Offer","price":"34.95","priceCurrency":"EUR"}}
  </script>
  <script type="application/ld+json">
  {"@type":"Product","name":"Heel ander parfum",
   "image":"https://media.example.com/AANBEVOLEN.jpg",
   "offers":{"@type":"Offer","price":"99.00","priceCurrency":"EUR"}}
  </script>
</head><body><h1>Lattafa Khamrah</h1></body></html>`;

test("pakt de foto van het hoofdproduct, niet van een aanbeveling", async ({
  page,
  baseURL,
}) => {
  await page.route("https://webshop.test/aanbevelingen", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: SHOP_WITH_RECOMMENDATIONS,
    }),
  );
  await page.goto("https://webshop.test/aanbevelingen");

  const target = await page.evaluate((code) => {
    const source = decodeURIComponent(code.replace(/^javascript:/, ""));
    let opened = "";
    (window as unknown as { open: (u: string) => null }).open = (u: string) => {
      opened = u;
      return null;
    };
    eval(source);
    return opened;
  }, buildBookmarklet(baseURL!));

  const params = new URL(target).searchParams;
  // Naam en prijs horen bij het hoofdproduct...
  expect(params.get("title")).toBe("Lattafa Khamrah Eau de Parfum 100ml");
  expect(params.get("price")).toBe("34.95");
  // ...en de foto dus ook, niet die van het aanbevolen parfum.
  expect(params.get("image")).toBe("https://media.example.com/HOOFDPRODUCT.jpg");
  expect(params.get("image")).not.toContain("AANBEVOLEN");
});

/** Meerdere foto's in het hoofdproduct: de eerste is de hoofdafbeelding. */
const SHOP_WITH_GALLERY = `<!doctype html>
<html><head>
  <script type="application/ld+json">
  {"@type":"Product","name":"Sonos Era 100",
   "image":["https://media.example.com/EERSTE.jpg",
            "https://media.example.com/tweede.jpg",
            "https://media.example.com/derde.jpg"],
   "offers":{"@type":"Offer","price":"249.00","priceCurrency":"EUR"}}
  </script>
</head><body></body></html>`;

test("kiest de eerste foto uit de reeks van het product", async ({
  page,
  baseURL,
}) => {
  await page.route("https://webshop.test/galerij", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: SHOP_WITH_GALLERY }),
  );
  await page.goto("https://webshop.test/galerij");

  const target = await page.evaluate((code) => {
    const source = decodeURIComponent(code.replace(/^javascript:/, ""));
    let opened = "";
    (window as unknown as { open: (u: string) => null }).open = (u: string) => {
      opened = u;
      return null;
    };
    eval(source);
    return opened;
  }, buildBookmarklet(baseURL!));

  expect(new URL(target).searchParams.get("image")).toBe(
    "https://media.example.com/EERSTE.jpg",
  );
});
