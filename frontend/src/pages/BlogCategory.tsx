import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FileText, CircleAlert, FolderOpen } from 'lucide-react';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import BlogLayout from '@/components/blog/BlogLayout';
import { PostCard, PostCardSkeleton } from '@/components/blog/PostCard';
import { CategorySidebar } from '@/components/blog/CategorySidebar';
import { SearchBar } from '@/components/blog/SearchBar';
import { PostsPagination } from '@/components/blog/PostsPagination';

const PAGE_SIZE = 6;

/**
 * 分类筛选页（公开访问）
 * URL: /blog/category/:slug?page=1&search=query
 * 布局与列表页一致，按分类 slug 过滤并展示分类名称
 */
export default function BlogCategoryPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('search') ?? undefined;

  const { data: categories } = useCategories();
  const currentCategory = categories?.find((cat) => cat.slug === slug);

  const { data, isLoading, isError } = usePosts({
    page,
    size: PAGE_SIZE,
    category: slug,
    search,
  });

  const handleSearch = (query: string) => {
    const next = new URLSearchParams(searchParams);
    if (query) next.set('search', query);
    else next.delete('search');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const buildHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (targetPage > 1) next.set('page', String(targetPage));
    const qs = next.toString();
    return qs ? `/blog/category/${slug}?${qs}` : `/blog/category/${slug}`;
  };

  const displayedPage = Math.min(page, data?.pages ?? 1);

  return (
    <BlogLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-12">
        {/* 内容区（桌面端在右） */}
        <div className="min-w-0 flex-1 lg:order-2">
          <div className="mb-6 flex items-center gap-2.5">
            <FolderOpen className="size-5 text-[var(--color-primary)]" />
            <h1 className="font-serif text-[24px] font-bold tracking-[0.01em] text-[var(--color-text-primary)]">
              {currentCategory?.name ?? '分类'}
            </h1>
            {currentCategory && (
              <span className="rounded-full bg-[#F2EADB] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]">
                {currentCategory.post_count} 篇
              </span>
            )}
          </div>

          <SearchBar initial={search ?? ''} onSearch={handleSearch} />

          <div className="mt-8">
            {isLoading ? (
              <div className="flex flex-col gap-6" aria-busy="true">
                {Array.from({ length: PAGE_SIZE }, (_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-20 text-center">
                <CircleAlert className="mx-auto size-10 text-[var(--color-text-muted)]" />
                <p className="mt-4 font-serif text-[20px] text-[var(--color-text-soft)]">
                  文章加载失败，请稍后重试
                </p>
              </div>
            ) : data && data.items.length > 0 ? (
              <div className="flex flex-col gap-6">
                {data.items.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-24 text-center">
                <FileText className="mx-auto size-12 text-[var(--color-text-muted)]" />
                <h2 className="mt-5 font-serif text-[22px] font-bold text-[var(--color-text-soft)]">
                  还没有文章
                </h2>
                <p className="mt-2 text-[13.5px] text-[var(--color-text-muted)]">
                  去
                  <Link
                    to="/admin"
                    className="mx-1 font-semibold text-[var(--color-primary)] no-underline hover:text-[var(--color-primary-dark)]"
                  >
                    管理后台
                  </Link>
                  写一篇吧
                </p>
              </div>
            )}
          </div>

          {data && (
            <PostsPagination
              page={displayedPage}
              pages={data.pages}
              buildHref={buildHref}
            />
          )}
        </div>

        {/* 分类侧边栏（桌面端在左，移动端折叠到下方） */}
        <CategorySidebar activeSlug={slug} className="lg:order-1" />
      </div>
    </BlogLayout>
  );
}
