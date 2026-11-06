import { chromium, defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3101";
process.env.CHROME_EXECUTABLE_PATH ??= chromium.executablePath();

export default defineConfig({
  testDir: "./tests/e2e/integration",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  globalSetup: "./tests/e2e/integration/global-setup.ts",
  reporter: "list",
  outputDir: "test-results/integration",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    acceptDownloads: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
