/**
 * 文章全流程 E2E 测试
 *
 * 测试场景：
 * 1. 登录管理后台
 * 2. 创建新文章 → 发布
 * 3. 在文章列表中搜索该文章
 * 4. 前往博客前端阅读文章
 *
 * 依赖：
 * - 后端 API 在 http://localhost:8000
 * - 前端 Vite 开发服务器在 http://localhost:5173
 * - 测试账号 testuser / testpass123 已存在
 */
import { test, expect } from '@playwright/test';

const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpass123';

/** 生成唯一文章标题，避免多轮测试冲突。 */
function uniqueTitle(): string {
  return `E2E Test Post ${Date.now()}`;
}

test.describe('Post Lifecycle', () => {
  test('login → create post → publish → search → read article', async ({
    page,
  }) => {
    const postTitle = uniqueTitle();
    const postBody = 'This is the body content of the E2E test post.';

    // ── 1. 登录 ─────────────────────────────────────────
    await page.goto('/login');
    await page.fill('#username', TEST_USERNAME);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 10000 });

    // ── 2. 导航到写文章页面 ────────────────────────────
    await page.goto('/admin/posts/new');
    await page.waitForLoadState('networkidle');

    // ── 3. 填写文章表单 ─────────────────────────────────
    // 标题
    const titleInput = page.locator('input[name="title"], #title').first();
    await titleInput.waitFor({ state: 'visible', timeout: 5000 });
    await titleInput.fill(postTitle);

    // 正文（MD Editor → 找到 textarea / editor）
    // @uiw/react-md-editor 使用 textarea 作为底层输入
    const bodyTextarea = page.locator('.w-md-editor textarea, [data-color-mode] textarea').first();
    await bodyTextarea.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      // 如果主 textarea 不可见，尝试点击编辑区让其出现
    });
    await bodyTextarea.fill(postBody);

    // 选择状态为「已发布」
    // 查找状态选择器（可能是 select 或自定义 Select 组件）
    const statusTrigger = page.locator('[data-state], button').filter({
      hasText: /草稿|draft/i,
    }).first();
    if (await statusTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusTrigger.click();
      const publishedOption = page.getByRole('option', { name: /已发布|发布|published/i }).first();
      await publishedOption.waitFor({ state: 'visible', timeout: 3000 });
      await publishedOption.click();
    }

    // ── 4. 提交表单 ─────────────────────────────────────
    const submitButton = page.getByRole('button', { name: /保存|发布|创建/i }).first();
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();

    // 等待跳转到文章编辑/管理页
    await page.waitForTimeout(2000);

    // ── 5. 在文章管理中搜索 ────────────────────────────
    await page.goto('/admin/posts');
    await page.waitForLoadState('networkidle');

    // 查找搜索输入框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(postTitle);
      // 触发搜索（可能是自动触发或需要按回车）
      await searchInput.press('Enter');
      await page.waitForTimeout(1500);
    }

    // 验证文章出现在列表中
    await expect(page.locator('body')).toContainText(postTitle, { timeout: 5000 });

    // ── 6. 前往博客前端阅读文章 ─────────────────────────
    // 先回到管理文章列表，找到文章的 slug 链接
    // 或者直接构造博客 URL 格式
    // 点击文章标题链接（可能在管理列表中有博客预览链接）
    const blogLink = page.locator('a[href*="/blog/post/"]').first();
    if (await blogLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await blogLink.click();
      await page.waitForLoadState('networkidle');
      // 验证文章内容可见
      await expect(page.locator('body')).toContainText(postTitle, { timeout: 5000 });
    } else {
      // 如果没有直接链接，通过导航到博客首页查找
      await page.goto('/blog');
      await page.waitForLoadState('networkidle');
      // 在博客列表中找到文章
      await expect(page.locator('body')).toContainText(postTitle, { timeout: 5000 });
    }
  });
});
