import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npx next start --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30000,
  },
})
