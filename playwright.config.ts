import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /mobile\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        // Laat CHROMIUM_PATH wijzen naar een al geïnstalleerde Chromium als de
        // versie niet overeenkomt met wat Playwright zelf zou downloaden.
        launchOptions: process.env.CHROMIUM_PATH
          ? { executablePath: process.env.CHROMIUM_PATH }
          : {},
      },
    },
    {
      // Een echte telefoonmaat, met aanraakbediening. Het toestel van Apple
      // draait normaal op WebKit; die hebben we hier niet, dus we nemen de
      // schermmaat over en draaien hem in Chromium.
      name: "mobiel",
      testMatch: /mobile\.spec\.ts/,
      use: {
        ...devices["iPhone 14 Pro"],
        browserName: "chromium",
        launchOptions: process.env.CHROMIUM_PATH
          ? { executablePath: process.env.CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: `npm run build && npx next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
