import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', testMatch: ['journey.spec.ts', 'marketplace.spec.ts'], use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 }, baseURL: 'http://127.0.0.1:4173' } },
    { name: 'mobile', testMatch: ['journey.spec.ts', 'marketplace.spec.ts'], use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', baseURL: 'http://127.0.0.1:4173' } },
    { name: 'http', testMatch: 'http.spec.ts', use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' } },
  ],
  webServer: [
    { command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false, env: { VITE_API_MODE: 'mock' } },
    { command: 'npm run dev -- --port 4174 --strictPort', url: 'http://127.0.0.1:4174', reuseExistingServer: false, env: { VITE_API_MODE: 'http', VITE_API_BASE_URL: '/api' } },
  ],
});
