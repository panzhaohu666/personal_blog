import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePost } from '@/hooks/usePosts';
import { ThemeToggle } from '@/components/ThemeToggle';

function readingTime(text: string): number {
  return Math.max(1, Math.ceil(text.replace(/[#*\->`~\n\s]/g, '').length / 400));
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError } = usePost(slug || '');
  const minutes = useMemo(() => post ? readingTime(post.body) : 0, [post]);

  if (!slug) return <div className="flex h-screen items-center justify-center bg-[#F7F2E9] dark:bg-gray-900 text-[#8E8375]">无效的文章链接</div>;
  if (isLoading) return (
    <div className="min-h-screen bg-[#F7F2E9] dark:bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-3xl space-y-6 p-10">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />)}
        </div>
      </div>
    </div>
  );
  if (isError || !post) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F2E9] dark:bg-gray-900 px-4 text-center">
      <h1 className="font-serif text-8xl font-bold text-gray-200 dark:text-gray-700">404</h1>
      <p className="mt-4 text-lg text-[#5F5649] dark:text-gray-400">文章不存在或已删除</p>
      <Link to="/blog" className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm text-white hover:bg-primary-dark">返回首页</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F2E9] dark:bg-gray-900 text-[#2B2620] dark:text-gray-100">
      <header className="sticky top-0 z-10 border-b border-[#E9DFCE] dark:border-gray-700 bg-[#F7F2E9]/90 dark:bg-gray-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link to="/blog" className="font-serif text-xl font-bold text-[#2B2620] dark:text-gray-100">个人博客</Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/blog" className="text-sm text-[#8E8375] hover:text-[#B9812F]">← 返回列表</Link>
          </div>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[#8E8375]">
            {post.category && <span className="rounded-full bg-accent-soft dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-accent-deep dark:text-amber-300">{post.category.name}</span>}
            <span>{new Date(post.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>· {minutes} 分钟阅读</span>
            <span>· {post.view_count} 次浏览</span>
          </div>
          <h1 className="font-serif text-3xl font-bold leading-tight">{post.title}</h1>
        </header>
        {post.image_url && (
          <img src={post.image_url} alt={post.title} className="mb-8 w-full rounded-xl object-cover max-h-96" />
        )}
        <div className="markdown-body prose-amber dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-[#E9DFCE] dark:border-gray-700 pt-6">
            {post.tags.map((tag) => (
              <span key={tag.id} className="rounded-full bg-accent-soft dark:bg-amber-900/40 px-3 py-1 text-sm text-accent-deep dark:text-amber-300">{tag.name}</span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
