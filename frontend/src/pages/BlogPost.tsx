import { Link, useParams } from 'react-router-dom';
import { usePost } from '@/hooks/usePosts';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError } = usePost(slug || '');

  if (!slug) return <div className="p-10 text-center text-[#8E8375]">无效的文章链接</div>;
  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#F7F2E9] text-[#8E8375]">加载中...</div>;
  if (isError || !post) return <div className="p-16 text-center text-[#5F5649]">文章不存在或已删除<Link to="/blog" className="ml-2 text-[#B9812F] hover:underline">返回首页</Link></div>;

  return (
    <div className="min-h-screen bg-[#F7F2E9]">
      <header className="sticky top-0 z-10 border-b border-[#E9DFCE] bg-[#F7F2E9]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link to="/blog" className="font-serif text-xl font-bold text-[#2B2620]">个人博客</Link>
          <Link to="/blog" className="text-sm text-[#8E8375] hover:text-[#B9812F]">← 返回列表</Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-3 text-sm text-[#8E8375]">
            {post.category && <span className="rounded-full bg-[#F4E8D3] px-2.5 py-0.5 text-xs font-medium text-[#8F5E1D]">{post.category.name}</span>}
            <span>{new Date(post.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>{post.view_count} 阅读</span>
          </div>
          <h1 className="font-serif text-3xl font-bold leading-tight text-[#2B2620]">{post.title}</h1>
        </header>
        {post.image_url && (
          <img src={post.image_url} alt={post.title} className="mb-8 w-full rounded-xl object-cover" />
        )}
        <div
          className="prose prose-amber max-w-none leading-relaxed text-[#2B2620]"
          dangerouslySetInnerHTML={{ __html: post.body.replace(/\n/g, '<br>') }}
        />
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag.id} className="rounded-full bg-[#F4E8D3] px-3 py-1 text-sm text-[#8F5E1D]">{tag.name}</span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
