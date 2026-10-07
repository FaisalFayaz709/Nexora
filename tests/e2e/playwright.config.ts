import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: '../../certification-output/pass-r18-test-runtime/playwright-results.json' }]],
  use: {
    baseURL: process.env.NEXORA_WEB_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'technician-mobile', use: { ...devices['Pixel 7'] } },
  ],
});
