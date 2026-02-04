import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  testIgnore: ['**/agent-flow.spec.ts'],
  timeout: 120 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'tests/reports/e2e-html' }],
    ['json', { outputFile: 'tests/reports/e2e-results.json' }],
    ['junit', { outputFile: 'tests/reports/e2e-junit.xml' }],
  ],
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
      },
    },
  ],
  webServer: {
    command: 'cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})

