import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    headless: false,
    viewport: { width: 480, height: 640 },
    actionTimeout: 10_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-webview",
      use: {
        // In Tauri E2E, we connect to the running WebView via CDP
        // or use the dev server URL for faster iteration
        baseURL: "http://localhost:1420",
      },
    },
  ],
});
