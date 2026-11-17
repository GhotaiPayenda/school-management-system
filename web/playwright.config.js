import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke tests are a secondary seam. The hard gate is the API suite in
 * tests/api; these journeys are opt-in because they require a built SPA, a
 * fresh seeded database, and a running API.
 *
 * See web/e2e/README.md for the full command sequence.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 600_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.MERIDIAN_WEB_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
