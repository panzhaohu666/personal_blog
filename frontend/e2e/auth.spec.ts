/**
 * 认证 E2E 测试
 *
 * 测试场景：
 * 1. 未登录用户访问 /login → 显示登录表单
 * 2. 输入凭据登录 → 跳转到 /admin 工作台
 * 3. 已登录用户访问 /login → 自动跳转到 /admin
 *
 * 依赖：
 * - 后端 API 必须在 http://localhost:8000 运行
 * - 前端 Vite 开发服务器在 http://localhost:5173
 * - 测试账号 testuser / testpass123 已存在
 */
import { test, expect } from '@playwright/test';

const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpass123';

test.describe('Login Flow', () => {
  test('login page displays login form', async ({ page }) => {
    await page.goto('/login');

    // 登录表单应显示
    await expect(page.locator('h1')).toContainText('个人博客');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /登录/i })).toBeVisible();
  });

  test('successful login redirects to admin dashboard', async ({ page }) => {
    await page.goto('/login');

    // 填写凭据
    await page.fill('#username', TEST_USERNAME);
    await page.fill('#password', TEST_PASSWORD);

    // 点击登录按钮
    await page.click('button[type="submit"]');

    // 应跳转到 /admin 工作台
    await page.waitForURL('**/admin', { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('already authenticated user is redirected from login to admin', async ({
    page,
  }) => {
    // 先登录
    await page.goto('/login');
    await page.fill('#username', TEST_USERNAME);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 10000 });

    // 再次访问 /login 应自动跳转到 /admin
    await page.goto('/login');
    await page.waitForURL('**/admin', { timeout: 5000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('login with wrong credentials shows error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');

    // 应显示错误消息
    await expect(page.locator('.text-danger, [class*="error"]').first()).toBeVisible({
      timeout: 5000,
    });
  });
});
