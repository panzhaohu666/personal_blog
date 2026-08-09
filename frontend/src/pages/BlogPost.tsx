import { Link, useParams } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ArrowLeft, Eye, CircleAlert } from 'lucide-react';
import { usePost } from '@/hooks/usePosts';
import BlogLayout from '@/components/blog/BlogLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

function formatDate(iso: string): string {
  return format(parseISO(iso), 'yyyy年MM月dd日', { locale: zhCN });
}

function BackButton() {
  return (
    <Button
      variant="ghost"
      asChild
      className="mb-6 -ml-2 text-[var(--color-text-soft)] hover:bg-[var(--color-primary-200)] hover:text-[var(--color-primary-dark)]"
    >
      <Link to="/blog">
        <ArrowLeft />
        <span>返回列表</span>
      </Link>
    </Button>
  );
}

/**
 * 文章详情页（公开访问）
 * URL: /blog/post/:slug
 * 样式：暖色米白背景 + 衬线标题 + 琥珀点缀，复刻 Django 模板 post_detail.html
 */
export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError } = usePost(slug ?? '');

  return (
    <BlogLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <BackButton />

        {isLoading ? (
          <article
            className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-card sm:p-12"
            aria-busy="true"
          >
            <Skeleton className="h-9 w-4/5" />
            <div className="mt-5 flex items-center gap-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-6 h-56 w-full rounded-xl" />
            <div className="mt-8 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </article>
        ) : isError || !post ? (
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-24 text-center">
            <CircleAlert className="mx-auto size-12 text-[var(--color-text-muted)]" />
            <h1 className="mt-5 font-serif text-[22px] font-bold text-[var(--color-text-soft)]">
              文章不存在或已被删除
            </h1>
            <p className="mt-2 text-[13.5px] text-[var(--color-text-muted)]">
              它可能被移动了，或者从未存在过
            </p>
          </div>
        ) : (
          <article className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-card sm:p-12">
            {post.image_url && (
              <img
                src={post.image_url}
                alt={post.title}
                className="mb-8 aspect-[16/8] w-full rounded-xl object-cover"
              />
            )}

            <h1 className="font-serif text-[26px] leading-[1.4] font-bold tracking-[0.01em] text-[var(--color-text-primary)] sm:text-[32px]">
              {post.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 pb-5 text-[13.5px] tracking-[0.02em] text-[var(--color-text-muted)]">
              {post.category && (
                <Badge
                  variant="secondary"
                  className="rounded-full bg-[var(--color-primary-200)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--color-primary-700)] transition-colors hover:bg-[var(--color-primary)] hover:text-[var(--color-bg-surface)]"
                >
                  <Link to={`/blog/category/${post.category.slug}`}>
                    {post.category.name}
                  </Link>
                </Badge>
              )}
              <time>{formatDate(post.created_at)}</time>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" />
                {post.view_count.toLocaleString()}
              </span>
            </div>

            <Separator className="bg-[var(--color-border-default)]" />

            <div data-color-mode="light" className="mt-8">
              <MDEditor.Markdown source={post.body} />
            </div>

            {post.tags.length > 0 && (
              <>
                <Separator className="mt-10 bg-[var(--color-border-default)]" />
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-[var(--color-primary-200)] px-3 py-0.5 text-[12.5px] text-[var(--color-primary-700)] transition-colors hover:bg-[var(--color-primary)] hover:text-[var(--color-bg-surface)]"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </article>
        )}
      </div>
    </BlogLayout>
  );
}
