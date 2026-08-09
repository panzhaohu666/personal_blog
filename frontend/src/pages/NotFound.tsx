/**
 * 404 页面未找到
 * 当用户访问不存在的路由时显示
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-warm)]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[var(--color-primary)]">404</h1>
        <p className="mt-4 text-lg text-[var(--color-text-soft)]">
          页面未找到
        </p>
        <a
          href="/blog"
          className="mt-6 inline-block rounded-md bg-[var(--color-primary)] px-6 py-2 text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          返回博客首页
        </a>
      </div>
    </div>
  );
}
