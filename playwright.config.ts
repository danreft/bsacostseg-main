import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // This test creates a real submission; do not automatically repeat it.
  retries: 0,
  workers: 1,
  timeout: 60_000,
  use: {
    browserName: "chromium",
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://localhost:3000/request",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
