import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // La suite contra el backend real vive en tests/live/ y corre con
  // playwright.live.config.ts (npm run test:live). Acá se ignora.
  testIgnore: ['live/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security']
        }
      },
    }
  ],
  webServer: {
    command: 'npx vite --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_API_URL: '/api'
    }
  },
});
