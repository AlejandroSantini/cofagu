import { defineConfig, devices } from '@playwright/test';
// Side-effect: parsea `.env.e2e` y lo vuelca a process.env antes de armar el config.
import { API_URL } from './tests/live/env';

/**
 * Suite E2E contra el backend REAL (Railway). NO intercepta `/api`.
 * Config aparte de `playwright.config.ts` (que es la suite mockeada).
 *
 *   npm run test:live            # corre todo
 *   npm run test:live -- --ui    # modo UI para ver el flujo
 *   npm run test:e2e:cleanup     # borra los viajes E2E- que hayan quedado
 */
export default defineConfig({
  testDir: './tests/live',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-live' }],
  ],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx vite --port 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Gana sobre el .env del repo: apunta la app al backend real de e2e.
    env: { VITE_API_URL: API_URL },
  },
});
