import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright visual regression and responsive preview configuration.
 * Configured for 5 standard viewports (Mobile Small, Mobile Large, Tablet, Desktop Small, Desktop Large).
 */
export default defineConfig({
  testDir: './tests',
  snapshotDir: './tests/__snapshots__',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'Mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        isMobile: true,
      },
    },
    {
      name: 'Tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'Desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'Large Desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Mobile Landscape',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 667, height: 375 },
        isMobile: true,
      },
    },
  ],

  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
