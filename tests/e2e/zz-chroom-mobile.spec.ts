import { test } from "@playwright/test";
import { createList, register } from "./helpers";

test.setTimeout(240_000);

test("chroom", async ({ page }) => {
  await register(page, "Chromer", "chroom");
  await createList(page, "Blauwe lijst");

  await page.getByRole("button", { name: "Instellingen van de lijst" }).click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Oceaan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Opslaan" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/claude-0/c1-lijst.png" });

  await page.goto("/dashboard");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/claude-0/c2-overzicht.png" });
});
