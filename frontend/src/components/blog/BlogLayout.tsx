import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * 博客前端公共布局
 * 顶栏（毛玻璃 + 衬线 Logo）+ 内容区 + 底栏，复刻 Django 模板 base.html 的暖色风格
 */
function BlogHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border-default)] bg-[rgba(247,242,233,0.82)] backdrop-blur-md">
      <div className="mx-auto flex h-[62px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/blog"
          className="font-serif text-[21px] font-bold tracking-[0.02em] text-[var(--color-text-primary)] no-underline"
        >
          <span className="text-[var(--color-primary)]">✦</span> 个人博客
        </Link>
        <nav className="flex items-center gap-6 text-[14.5px] text-[var(--color-text-soft)]">
          <Link
            to="/blog"
            className="transition-colors hover:text-[var(--color-primary-dark)]"
          >
            首页
          </Link>
          <Link
            to="/admin"
            className="transition-colors hover:text-[var(--color-primary-dark)]"
          >
            管理
          </Link>
        </nav>
      </div>
    </header>
  );
}

function BlogFooter() {
  return (
    <footer className="mt-10 border-t border-[var(--color-border-default)] px-4 py-11 text-center text-[13px] text-[var(--color-text-muted)]">
      © {new Date().getFullYear()} 个人博客 · Powered by React
    </footer>
  );
}

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-warm)]">
      <BlogHeader />
      <main className="flex-1">{children}</main>
      <BlogFooter />
    </div>
  );
}
