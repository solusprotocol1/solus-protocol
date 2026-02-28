import { defineConfig, devices } from '@playwright/test';

/**
 * S4 Ledger — Playwright E2E Configuration
 * Runs smoke tests against both prod-app and demo-app builds.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:9999',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'python3 /tmp/s4_serve.py || npx serve -l 9999 -s .',
    url: 'http://localhost:9999',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
