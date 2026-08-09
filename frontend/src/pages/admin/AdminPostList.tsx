import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminPosts, useDeletePost } from '@/hooks/usePosts';

function fmtDate(iso: string) { return iso ? new Date(iso).toLocaleDateString('zh-CN') : ''; }

export default function AdminPostList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('search') || '';
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAdminPosts({ page, size: 20, search: search || undefined });
  const deletePost = useDeletePost();

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await deletePost.mutateAsync(confirmId);
      setMsg('文章已删除'); setConfirmId(null); refetch();
    } catch { setMsg('删除失败'); }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (new FormData(e.currentTarget).get('q') as string).trim();
    const next = new URLSearchParams();
    if (q) next.set('search', q);
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-[#2B2620]">文章管理</h1>
        <Link to="/admin/posts/new" className="rounded-xl bg-[#B9812F] px-4 py-2 text-sm text-white hover:bg-[#8F5E1D]">+ 写文章</Link>
      </div>
      {msg && <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{msg} <button onClick={() => setMsg(null)} className="ml-2 font-bold">×</button></div>}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input name="q" defaultValue={search} placeholder="搜索文章标题..." className="flex-1 rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] px-3 py-2 text-sm focus:border-[#B9812F] focus:outline-none" />
        <button type="submit" className="rounded-xl border border-[#E9DFCE] px-4 py-2 text-sm text-[#5F5649] hover:bg-[#F4E8D3]">搜索</button>
      </form>
      {isLoading ? (
        <div className="p-10 text-center text-[#8E8375]">加载中...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E9DFCE] bg-[#FFFDF8]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E9DFCE] bg-[#F7F2E9] text-[#5F5649]">
              <tr>
                <th className="px-4 py-3 font-medium">标题</th><th className="px-4 py-3 font-medium">分类</th><th className="px-4 py-3 font-medium">状态</th><th className="px-4 py-3 font-medium">日期</th><th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[#8E8375]">暂无文章</td></tr>
              ) : (
                data?.items.map((post) => (
                  <tr key={post.id} className="border-b border-[#E9DFCE] last:border-0 hover:bg-[#F7F2E9]">
                    <td className="px-4 py-3 font-medium text-[#2B2620]">{post.title}</td>
                    <td className="px-4 py-3 text-[#5F5649]">{post.category?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {post.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#8E8375]">{fmtDate(post.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link to={`/admin/posts/${post.id}/edit`} className="text-[#B9812F] hover:underline">编辑</Link>
                        <button onClick={() => setConfirmId(post.id)} className="text-red-500 hover:underline">删除</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmId(null)}>
          <div className="w-full max-w-sm rounded-xl bg-[#FFFDF8] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-[#2B2620]">确定要删除这篇文章吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmId(null)} className="rounded-xl border border-[#E9DFCE] px-4 py-2 text-sm text-[#5F5649]">取消</button>
              <button onClick={handleDelete} disabled={deletePost.isPending} className="rounded-xl bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
