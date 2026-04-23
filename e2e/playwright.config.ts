import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: process.env.CI
    ? 'blob'
    : [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
});
