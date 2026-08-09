/**
 * Playwright E2E 测试配置
 *
 * - 浏览器：Chromium
 * - baseURL：http://localhost:5173（Vite 开发服务器）
 * - 测试目录：./e2e/
 *
 * 运行方式（后端需先启动）：
 *     npx playwright test
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 不需要 webServer：测试假定前端和后端已独立运行
});
