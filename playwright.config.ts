import { defineConfig } from '@playwright/test';

/**
 * E2E config. Run with `npm run test:e2e` against a running server
 * (set E2E_BASE_URL, default http://localhost:3000). Requires browsers:
 * `npx playwright install chromium`. Not part of the default CI gate — the CI
 * workflow runs lint + typecheck + unit tests + build (fast, no browser/DB).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
  },
});
