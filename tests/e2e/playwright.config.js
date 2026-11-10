// Konfiguracija Playwright Test za funkcionalne teste EventEase.
// Testni primeri: docs/testiranje/Specifikacija_testov.md, poročilo: docs/testiranje/Porocilo_avtomatizacije.md.
//
// Okolje:
//   BASE_URL           naslov zagnane aplikacije (privzeto http://localhost:8080)
//   TEST_DATABASE_URL  testna baza za preverjanje stanja (privzeto ...@127.0.0.1:5433/eventeasedb)
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  // Vsi testi uporabljajo isto bazo, zato tečejo zaporedno v enem delavcu.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: "test-results/artefakti",
  reporter: [
    ["list"],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["json", { outputFile: "test-results/rezultati.json" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8080",
    headless: true,
    actionTimeout: 8_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } },
    },
  ],
});
