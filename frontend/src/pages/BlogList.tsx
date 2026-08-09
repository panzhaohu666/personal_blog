import { Link, useSearchParams } from 'react-router-dom';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SearchBar } from '@/components/SearchBar';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function estimateRead(body: string) {
  return Math.max(1, Math.ceil(body.replace(/[#*\->`~\n\s]/g, '').length / 400));
}

function SkeletonCard() {
  return <div className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-6 animate-pulse"><div className="mb-3 flex gap-2"><div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" /></div><div className="h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-3" /><div className="space-y-2"><div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" /><div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" /></div></div>;
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

  const linkClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm ${active ? 'bg-amber-100 dark:bg-amber-900/40 font-medium text-amber-700 dark:text-amber-300' : 'text-[#5F5649] dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-gray-700'}`;

  return (
    <div className="min-h-screen bg-[#F7F2E9] dark:bg-gray-900 text-[#2B2620] dark:text-gray-100">
      <header className="sticky top-0 z-10 border-b border-[#E9DFCE] dark:border-gray-700 bg-[#F7F2E9]/90 dark:bg-gray-900/90 backdrop-blur">
        <div className="flex w-full items-center justify-between px-6 py-3">
          <Link to="/blog" className="font-serif text-xl font-bold text-[#2B2620] dark:text-gray-100">个人博客</Link>
          <div className="flex items-center gap-4">
            <a href="/blog/rss.xml" target="_blank" className="text-xs text-[#8E8375] dark:text-gray-400 hover:text-[#F26522] flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#F26522]" />RSS</a>
            <ThemeToggle />
            <Link to="/login" className="text-sm text-[#8E8375] dark:text-gray-400 hover:text-[#B9812F] dark:hover:text-amber-400">管理</Link>
          </div>
        </div>
      </header>
      <div className="flex w-full flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-60">
          <div className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-5">
            <h3 className="font-serif font-bold text-[#2B2620] dark:text-gray-100">分类</h3>
            <div className="mt-3 flex flex-col gap-0.5">
              <Link to="/blog" className={linkClass(!category)}>全部</Link>
              {categories?.map((cat) => (
                <Link key={cat.id} to={`/blog/category/${cat.slug}`} className={`flex justify-between ${linkClass(category === cat.slug)}`}>
                  <span>{cat.name}</span><span className="text-[#B9812F] dark:text-amber-400">{cat.post_count}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <SearchBar defaultValue={search || ''} placeholder="搜索文章..." onSearch={(q) => { const next = new URLSearchParams(); if (q) next.set('search', q); setSearchParams(next, { replace: true }); }} className="mb-8" />
          {isLoading ? (
            <div className="flex flex-col gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : isError ? (
            <div className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-16 text-center"><p className="text-lg text-red-500">加载失败: {String(error)}</p><button onClick={() => window.location.reload()} className="mt-2 text-sm text-[#B9812F] hover:underline">重试</button></div>
          ) : data && data.items.length === 0 ? (
            <div className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-16 text-center"><p className="text-lg text-[#5F5649] dark:text-gray-400">还没有文章</p><Link to="/login" className="mt-2 inline-block text-sm text-[#B9812F] dark:text-amber-400 hover:underline">去管理后台写一篇</Link></div>
          ) : (
            <div className="flex flex-col gap-5">
              {data?.items.map((post) => (
                <Link key={post.id} to={`/blog/post/${post.slug}`} className="flex gap-5 rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  {post.image_url && <img src={post.image_url} alt="" className="hidden h-28 w-44 shrink-0 rounded-lg object-cover sm:block" />}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-3 text-xs text-[#8E8375] dark:text-gray-400">
                    {post.category && <span className="rounded-full bg-[#F4E8D3] dark:bg-amber-900/40 px-2.5 py-0.5 font-medium text-[#8F5E1D] dark:text-amber-300">{post.category.name}</span>}
                    <span>{fmtDate(post.created_at)}</span><span>· {estimateRead(post.excerpt || '')} 分钟</span>
                  </div>
                  <h2 className="mb-2 font-serif text-xl font-bold text-[#2B2620] dark:text-gray-100">{post.title}</h2>
                  {post.excerpt && <p className="line-clamp-3 text-sm leading-relaxed text-[#5F5649] dark:text-gray-400">{post.excerpt}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {post.tags?.map((tag) => <span key={tag.id} className="rounded-full bg-[#F4E8D3] dark:bg-amber-900/40 px-2.5 py-0.5 text-xs text-[#8F5E1D] dark:text-amber-300">{tag.name}</span>)}
                    <span className="ml-auto text-xs text-[#8E8375] dark:text-gray-500">{post.view_count} 阅读</span>
                  </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {data && data.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => goPage(page - 1)} className="rounded-lg border border-[#E9DFCE] dark:border-gray-600 px-3 py-1.5 text-sm text-[#5F5649] dark:text-gray-400 disabled:opacity-30">上一页</button>
              <span className="text-sm text-[#8E8375] dark:text-gray-500">第 {page} / {data.pages} 页</span>
              <button disabled={page >= data.pages} onClick={() => goPage(page + 1)} className="rounded-lg border border-[#E9DFCE] dark:border-gray-600 px-3 py-1.5 text-sm text-[#5F5649] dark:text-gray-400 disabled:opacity-30">下一页</button>
            </div>
          )}
        </div>
      </div>
      <footer className="border-t border-[#E9DFCE] dark:border-gray-700 mt-16 py-8 text-center text-xs text-[#8E8375] dark:text-gray-500"><p>© {new Date().getFullYear()} 个人博客 · <a href="/blog/rss.xml" className="text-[#F26522] hover:underline">RSS 订阅</a></p></footer>
    </div>
  );
}
