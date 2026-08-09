import { Link, useSearchParams } from 'react-router-dom';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function estimateRead(body: string) {
  return Math.max(1, Math.ceil(body.replace(/[#*\->`~\n\s]/g, '').length / 400));
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-line dark:border-gray-700 bg-surface dark:bg-gray-800 p-6 animate-pulse">
      <div className="mb-3 flex gap-2"><div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" /></div>
      <div className="h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
      <div className="space-y-2"><div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" /><div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" /></div>
    </div>
  );
}

export default function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const category = searchParams.get('category') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  const { data, isLoading, isError, error } = usePosts({ page, size: 10, category, search });
  const { data: categories } = useCategories();

  const goPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p > 1) next.set('page', String(p)); else next.delete('page');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-gray-900 text-primary-text dark:text-gray-100">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 border-b border-line dark:border-gray-700 bg-bg-warm/90 dark:bg-gray-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/blog" className="font-serif text-xl font-bold">个人博客</Link>
          <div className="flex items-center gap-4">
            <a href="/blog/rss.xml" target="_blank" className="text-xs text-muted hover:text-[#F26522] flex items-center gap-1" title="RSS 订阅">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#F26522] mr-0.5" /> RSS
            </a>
            <button onClick={() => { document.documentElement.classList.toggle('dark'); localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'; }} className="text-sm text-muted hover:text-primary">{typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '☀️' : '🌙'}</button>
            <Link to="/login" className="text-sm text-muted hover:text-primary">管理</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row">
        {/* 侧边栏 */}
        <aside className="w-full shrink-0 lg:w-60">
          <div className="rounded-xl border border-line dark:border-gray-700 bg-surface dark:bg-gray-800 p-5">
            <h3 className="font-serif font-bold">分类</h3>
            <div className="mt-3 flex flex-col gap-0.5">
              <Link to="/blog" className={`rounded-lg px-3 py-1.5 text-sm ${!category ? 'bg-amber-100 dark:bg-amber-900/40 font-medium text-amber-700 dark:text-amber-300' : 'text-soft dark:text-gray-400 hover:bg-accent-soft dark:hover:bg-gray-700'}`}>全部</Link>
              {categories?.map((cat) => (
                <Link key={cat.id} to={`/blog/category/${cat.slug}`} className={`flex justify-between rounded-lg px-3 py-1.5 text-sm ${category === cat.slug ? 'bg-amber-100 dark:bg-amber-900/40 font-medium text-amber-700 dark:text-amber-300' : 'text-soft dark:text-gray-400 hover:bg-accent-soft dark:hover:bg-gray-700'}`}>
                  <span>{cat.name}</span><span className="text-primary">{cat.post_count}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* 主内容 */}
        <div className="min-w-0 flex-1">
          <form onSubmit={(e) => { e.preventDefault(); const q = (new FormData(e.currentTarget).get('q') as string).trim(); const next = new URLSearchParams(); if (q) next.set('search', q); setSearchParams(next, { replace: true }); }} className="mb-8 flex gap-2">
            <input name="q" defaultValue={search || ''} placeholder="搜索文章..." className="flex-1 rounded-xl border border-line dark:border-gray-600 bg-surface dark:bg-gray-800 px-4 py-2 text-sm focus:border-primary focus:outline-none dark:text-gray-100" />
            <button type="submit" className="rounded-xl bg-primary px-5 py-2 text-sm text-white hover:bg-primary-dark">搜索</button>
          </form>

          {isLoading ? (
            <div className="flex flex-col gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : isError ? (
            <div className="rounded-xl border border-line dark:border-gray-700 bg-surface dark:bg-gray-800 p-16 text-center">
              <p className="text-lg text-red-500">加载失败: {String(error)}</p>
              <button onClick={() => window.location.reload()} className="mt-2 text-sm text-primary hover:underline">重试</button>
            </div>
          ) : data && data.items.length === 0 ? (
            <div className="rounded-xl border border-line dark:border-gray-700 bg-surface dark:bg-gray-800 p-16 text-center">
              <p className="text-lg text-soft dark:text-gray-400">还没有文章</p>
              <Link to="/login" className="mt-2 inline-block text-sm text-primary hover:underline">去管理后台写一篇</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {data?.items.map((post) => (
                <Link key={post.id} to={`/blog/post/${post.slug}`} className="rounded-xl border border-line dark:border-gray-700 bg-surface dark:bg-gray-800 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:hover:bg-gray-750">
                  <div className="mb-1 flex items-center gap-3 text-xs text-muted">
                    {post.category && <span className="rounded-full bg-accent-soft dark:bg-amber-900/40 px-2.5 py-0.5 font-medium text-accent-deep dark:text-amber-300">{post.category.name}</span>}
                    <span>{fmtDate(post.created_at)}</span>
                    <span>· {estimateRead(post.excerpt || '')} 分钟</span>
                  </div>
                  <h2 className="mb-2 font-serif text-xl font-bold">{post.title}</h2>
                  {post.excerpt && <p className="line-clamp-3 text-sm leading-relaxed text-soft dark:text-gray-400">{post.excerpt}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {post.tags?.map((tag) => <span key={tag.id} className="rounded-full bg-accent-soft dark:bg-amber-900/40 px-2.5 py-0.5 text-xs text-accent-deep dark:text-amber-300">{tag.name}</span>)}
                    <span className="ml-auto text-xs text-muted">{post.view_count} 阅读</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {data && data.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => goPage(page - 1)} className="rounded-lg border border-line dark:border-gray-600 px-3 py-1.5 text-sm text-soft dark:text-gray-400 disabled:opacity-30">上一页</button>
              <span className="text-sm text-muted">第 {page} / {data.pages} 页</span>
              <button disabled={page >= data.pages} onClick={() => goPage(page + 1)} className="rounded-lg border border-line dark:border-gray-600 px-3 py-1.5 text-sm text-soft dark:text-gray-400 disabled:opacity-30">下一页</button>
            </div>
          )}
        </div>
      </div>

      {/* 页脚 */}
      <footer className="border-t border-line dark:border-gray-700 mt-16 py-8 text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} 个人博客 · <a href="/blog/rss.xml" className="text-[#F26522] hover:underline">RSS 订阅</a></p>
      </footer>
    </div>
  );
}
