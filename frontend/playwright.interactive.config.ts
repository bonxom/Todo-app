import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "interactive-task-actions-live.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    cwd: import.meta.dirname,
    url: "http://127.0.0.1:5000",
    reuseExistingServer: false,
    env: {
      VITE_SERVER_URL: "http://127.0.0.1:4011",
    },
  },
});
