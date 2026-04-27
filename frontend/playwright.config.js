import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 設定
 *
 * 跑法：
 *   npm run test:e2e            完整跑（會自動 spawn vite dev）
 *   npm run test:e2e -- --ui    互動式 UI（看 trace、step debug）
 *   npm run test:e2e -- --headed  看到瀏覽器
 *
 * 後端：spec 內用 page.route 攔截所有 /api/*，不依賴本機後端 server。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 串行避免 vite dev server 衝突
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  timeout: 30000,
  expect: { timeout: 5000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true, // 已開著的 vite 不要重啟
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
