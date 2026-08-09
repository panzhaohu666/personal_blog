import { useState } from 'react';
import { useTags, useCreateTag, useDeleteTag } from '@/hooks/useCategories';

export default function AdminTags() {
  const { data: tags, isLoading, refetch } = useTags();
  const create = useCreateTag();
  const del = useDeleteTag();
  const [name, setName] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; await create.mutateAsync({ name: name.trim() }); setName(''); refetch(); };
  const handleDelete = async () => { if (!confirmId) return; await del.mutateAsync(confirmId); setConfirmId(null); refetch(); };

  return (
    <div className="max-w-6xl">
      <h1 className="mb-6 font-serif text-2xl font-bold text-[#2B2620]">标签管理</h1>
      <form onSubmit={handleAdd} className="mb-4 flex items-end gap-2">
        <div><label className="block text-xs text-[#8E8375] mb-1">标签名称</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-48 rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] px-3 py-2 text-sm focus:border-[#B9812F] focus:outline-none" /></div>
        <button type="submit" disabled={create.isPending} className="rounded-xl bg-[#B9812F] px-4 py-2 text-sm text-white hover:bg-[#8F5E1D]">添加</button>
      </form>
      {isLoading ? <p className="text-[#8E8375]">加载中...</p> : (
        <div className="overflow-x-auto rounded-xl border border-[#E9DFCE] bg-[#FFFDF8]">
          <table className="w-full text-left text-sm"><thead className="border-b border-[#E9DFCE] bg-[#F7F2E9]"><tr><th className="px-4 py-3 font-medium text-[#5F5649]">名称</th><th className="px-4 py-3 font-medium text-[#5F5649]">文章数</th><th className="px-4 py-3 font-medium text-[#5F5649]">操作</th></tr></thead>
            <tbody>
              {tags?.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-[#8E8375]">暂无标签</td></tr> : tags?.map((tag) => (
                <tr key={tag.id} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{tag.name}</td><td className="px-4 py-3 text-[#8E8375]">{tag.post_count}</td><td className="px-4 py-3"><button onClick={() => setConfirmId(tag.id)} className="text-red-500 hover:underline text-xs">删除</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmId(null)}><div className="w-80 rounded-xl bg-[#FFFDF8] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}><p className="mb-4 text-sm">确定删除此标签？</p><div className="flex justify-end gap-2"><button onClick={() => setConfirmId(null)} className="rounded-xl border px-3 py-1.5 text-sm">取消</button><button onClick={handleDelete} className="rounded-xl bg-red-500 px-3 py-1.5 text-sm text-white">删除</button></div></div></div>
      )}
    </div>
  );
}
