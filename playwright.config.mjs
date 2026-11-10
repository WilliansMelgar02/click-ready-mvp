import { defineConfig } from '@playwright/test';

const canal = process.env.PW_CANAL || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    channel: canal,
    locale: 'es-CL',
    viewport: { width: 1366, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/servidor.mjs app 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
