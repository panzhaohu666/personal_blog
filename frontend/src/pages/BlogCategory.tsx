import { Link, useParams, useSearchParams } from 'react-router-dom';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const { data, isLoading, isError, error } = usePosts({ page, size: 10, category: slug });
  const { data: categories } = useCategories();
  const catName = categories?.find((c) => c.slug === slug)?.name || slug;

  const goPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p > 1) next.set('page', String(p)); else next.delete('page');
    setSearchParams(next, { replace: true });
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#F7F2E9] text-[#8E8375]">加载中...</div>;
  if (isError) return <div className="flex min-h-screen items-center justify-center bg-[#F7F2E9] text-red-500">加载失败: {String(error)}</div>;

  return (
    <div className="min-h-screen bg-[#F7F2E9]">
      <header className="sticky top-0 z-10 border-b border-[#E9DFCE] bg-[#F7F2E9]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/blog" className="font-serif text-xl font-bold text-[#2B2620]">个人博客</Link>
          <Link to="/login" className="text-sm text-[#8E8375] hover:text-[#B9812F]">管理</Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-60">
          <div className="rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] p-5">
            <h3 className="font-serif font-bold text-[#2B2620]">分类</h3>
            <div className="mt-3 flex flex-col gap-0.5">
              <Link to="/blog" className="rounded-lg px-3 py-1.5 text-sm text-[#5F5649] hover:bg-[#F4E8D3]">全部</Link>
              {categories?.map((cat) => (
                <Link key={cat.id} to={`/blog/category/${cat.slug}`} className={`flex justify-between rounded-lg px-3 py-1.5 text-sm ${slug === cat.slug ? 'bg-amber-100 font-medium text-amber-700' : 'text-[#5F5649] hover:bg-[#F4E8D3]'}`}>
                  <span>{cat.name}</span><span className="text-[#B9812F]">{cat.post_count}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <h1 className="mb-6 font-serif text-2xl font-bold text-[#2B2620]">分类：{catName}</h1>
          {data && data.items.length === 0 ? (
            <div className="rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] p-16 text-center">
              <p className="text-lg text-[#5F5649]">该分类下还没有文章</p>
              <Link to="/blog" className="mt-2 inline-block text-sm text-[#B9812F] hover:underline">返回首页</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {data?.items.map((post) => (
                <Link key={post.id} to={`/blog/post/${post.slug}`} className="rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-1 flex items-center gap-3 text-xs text-[#8E8375]">
                    {post.category && <span className="rounded-full bg-[#F4E8D3] px-2.5 py-0.5 font-medium text-[#8F5E1D]">{post.category.name}</span>}
                    <span>{fmtDate(post.created_at)}</span>
                  </div>
                  <h2 className="mb-2 font-serif text-xl font-bold text-[#2B2620]">{post.title}</h2>
                  {post.excerpt && <p className="line-clamp-3 text-sm leading-relaxed text-[#5F5649]">{post.excerpt}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {post.tags?.map((tag) => <span key={tag.id} className="rounded-full bg-[#F4E8D3] px-2.5 py-0.5 text-xs text-[#8F5E1D]">{tag.name}</span>)}
                    <span className="ml-auto text-xs text-[#8E8375]">{post.view_count} 阅读</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {data && data.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => goPage(page - 1)} className="rounded-lg border border-[#E9DFCE] px-3 py-1.5 text-sm text-[#5F5649] disabled:opacity-40">上一页</button>
              <span className="text-sm text-[#8E8375]">第 {page} / {data.pages} 页</span>
              <button disabled={page >= data.pages} onClick={() => goPage(page + 1)} className="rounded-lg border border-[#E9DFCE] px-3 py-1.5 text-sm text-[#5F5649] disabled:opacity-40">下一页</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
