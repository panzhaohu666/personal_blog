import { Link } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CategorySidebarProps {
  /** 当前激活的分类 slug（用于高亮） */
  activeSlug?: string;
  className?: string;
}

/**
 * 分类侧边栏 —— 复刻 Django 模板 base.html 的 .sidebar-widget 样式
 * 桌面端在左侧，移动端折叠到内容下方
 */
export function CategorySidebar({
  activeSlug,
  className,
}: CategorySidebarProps) {
  const { data: categories, isLoading } = useCategories();
  const totalCount =
    categories?.reduce((sum, cat) => sum + cat.post_count, 0) ?? 0;

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-[var(--color-text-soft)] transition-all duration-200',
      active
        ? 'bg-[var(--color-primary-200)] font-medium text-[var(--color-primary-700)]'
        : 'hover:bg-[var(--color-primary-200)] hover:pl-4 hover:text-[var(--color-primary-dark)]'
    );

  return (
    <aside className={cn('w-full shrink-0 lg:w-[280px]', className)}>
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6 shadow-card">
        <h3 className="flex items-center gap-2 font-serif text-[16.5px] font-bold tracking-[0.02em] text-[var(--color-text-primary)]">
          <FolderOpen className="size-4 text-[var(--color-primary)]" />
          文章分类
        </h3>
        <Separator className="my-3.5 bg-[var(--color-border-default)]" />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <nav className="flex flex-col gap-0.5" aria-label="文章分类">
            <Link
              to="/blog"
              className={linkClass(activeSlug === undefined)}
              aria-current={activeSlug === undefined ? 'page' : undefined}
            >
              <span>全部文章</span>
              <span className="rounded-full bg-[#F2EADB] px-2 py-0.5 text-xs text-[var(--color-text-muted)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-bg-surface)]">
                {totalCount}
              </span>
            </Link>
            {categories?.map((cat) => {
              const active = activeSlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  to={`/blog/category/${cat.slug}`}
                  className={cn(
                    linkClass(active),
                    'group hover:pl-4'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <span>{cat.name}</span>
                  <span className="rounded-full bg-[#F2EADB] px-2 py-0.5 text-xs text-[var(--color-text-muted)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-bg-surface)]">
                    {cat.post_count}
                  </span>
                </Link>
              );
            })}
            {categories?.length === 0 && (
              <p className="px-2 py-2 text-[13px] text-[var(--color-text-muted)]">
                暂无分类
              </p>
            )}
          </nav>
        )}
      </div>
    </aside>
  );
}
