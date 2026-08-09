import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { PostSummary } from '@/types';

function formatDate(iso: string): string {
  return format(parseISO(iso), 'yyyy年MM月dd日', { locale: zhCN });
}

/**
 * 文章卡片 —— 列表页/分类页共用
 * 结构复刻 Django 模板 post_list.html 的 .post-card 样式
 */
export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Card className="group gap-0 rounded-2xl border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-[#E4D5BC] hover:shadow-card-hover sm:p-[30px]">
      <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[13px] tracking-[0.02em] text-[var(--color-text-muted)]">
        {post.category && (
          <>
            <Badge
              variant="secondary"
              className="rounded-full bg-[var(--color-primary-200)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--color-primary-700)] transition-colors hover:bg-[var(--color-primary)] hover:text-[var(--color-bg-surface)]"
            >
              <Link to={`/blog/category/${post.category.slug}`}>
                {post.category.name}
              </Link>
            </Badge>
            <span aria-hidden>·</span>
          </>
        )}
        <time>{formatDate(post.created_at)}</time>
      </div>

      <h2 className="font-serif text-[22px] leading-[1.4] font-bold text-[var(--color-text-primary)] sm:text-[24px]">
        <Link
          to={`/blog/post/${post.slug}`}
          className="transition-colors hover:text-[var(--color-primary-dark)]"
        >
          {post.title}
        </Link>
      </h2>

      {post.excerpt && (
        <p className="mt-2.5 line-clamp-3 text-[14.5px] leading-[1.85] text-[var(--color-text-soft)]">
          {post.excerpt}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {post.tags.slice(0, 4).map((tag) => (
          <span
            key={tag.id}
            className="rounded-full bg-[var(--color-primary-200)] px-3 py-0.5 text-[12.5px] text-[var(--color-primary-700)] transition-colors hover:bg-[var(--color-primary)] hover:text-[var(--color-bg-surface)]"
          >
            {tag.name}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
          <Eye className="size-3.5" />
          {post.view_count.toLocaleString()}
        </span>
      </div>
    </Card>
  );
}

/** 文章卡片加载占位（骨架屏） */
export function PostCardSkeleton() {
  return (
    <Card className="gap-3 rounded-2xl border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6 shadow-card sm:p-[30px]">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <Skeleton className="h-7 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="ml-auto h-4 w-16" />
      </div>
    </Card>
  );
}
