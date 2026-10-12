import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  globalSetup: './support/classic-stand-in.ts',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'report', open: 'never' }],
    ['json', { outputFile: 'journeys.json' }],
  ],
  outputDir: 'results',
  use: {
    baseURL: process.env.MOBILE_BASE_URL ?? 'http://localhost:8081',
    video: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
  ],
});
