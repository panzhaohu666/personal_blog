import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdminPost, useCreatePost, useUpdatePost, useUploadImage } from '@/hooks/usePosts';
import { useCategories, useTags } from '@/hooks/useCategories';
import type { PostFormData } from '@/types';

export default function AdminPostEditor() {
  const { postId } = useParams<{ postId?: string }>();
  const isEdit = !!postId;
  const navigate = useNavigate();

  const { data: post, isLoading: loadingPost } = useAdminPost(postId);
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const uploadImage = useUploadImage();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [imageUrl, setImageUrl] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post && isEdit) {
      setTitle(post.title);
      setSlug(post.slug || '');
      setCategoryId(post.category?.id || '');
      setTagIds(post.tags?.map((t) => t.id) || []);
      setExcerpt(post.excerpt || '');
      setBody(post.body);
      setStatus(post.status);
      setImageUrl(post.image_url || '');
    }
  }, [post, isEdit]);

  const toggleTag = (id: string) => {
    setTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadImage.mutateAsync(file);
      setImageUrl(result.url);
      setMsg({ type: 'success', text: '图片上传成功' });
    } catch {
      setMsg({ type: 'error', text: '上传失败' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) { setMsg({ type: 'error', text: '标题和正文不能为空' }); return; }
    setSaving(true);
    const payload: PostFormData = {
      title, slug: slug || undefined, category_id: categoryId || undefined,
      tag_ids: tagIds, excerpt, body, status, image_url: imageUrl || undefined,
    };
    try {
      if (isEdit && postId) {
        await updatePost.mutateAsync({ id: postId, data: payload });
        setMsg({ type: 'success', text: '文章已更新' });
      } else {
        await createPost.mutateAsync(payload);
        setMsg({ type: 'success', text: '文章已创建' });
      }
      setTimeout(() => navigate('/admin/posts'), 500);
    } catch {
      setMsg({ type: 'error', text: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingPost) return <div className="p-10 text-center text-[#8E8375]">加载文章...</div>;

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-[#2B2620]">{isEdit ? '编辑文章' : '写文章'}</h1>
      {msg && <div className={`mb-4 rounded-xl p-3 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block mb-1 text-sm font-medium text-[#5F5649]">标题</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] px-4 py-2.5 text-sm focus:border-[#B9812F] focus:outline-none" placeholder="文章标题" />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-[#5F5649]">URL 标识</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] px-4 py-2.5 text-sm focus:border-[#B9812F] focus:outline-none" placeholder="留空自动生成" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block mb-1 text-sm font-medium text-[#5F5649]">分类</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] px-4 py-2.5 text-sm focus:border-[#B9812F] focus:outline-none">
              <option value="">无分类</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block mb-1 text-sm font-medium text-[#5F5649]">状态</label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={status === 'draft'} onChange={() => setStatus('draft')} className="accent-[#B9812F]" />草稿</label>
              <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={status === 'published'} onChange={() => setStatus('published')} className="accent-[#B9812F]" />发布</label>
            </div>
          </div>
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-[#5F5649]">标签</label>
          <div className="flex flex-wrap gap-2">
            {tags?.map((tag) => (
              <button type="button" key={tag.id} onClick={() => toggleTag(tag.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${tagIds.includes(tag.id) ? 'border-[#B9812F] bg-[#B9812F] text-white' : 'border-[#E9DFCE] text-[#5F5649] hover:bg-[#F4E8D3]'}`}
              >{tag.name}</button>
            ))}
            {(!tags || tags.length === 0) && <span className="text-xs text-[#8E8375]">暂无标签，先去标签管理添加</span>}
          </div>
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-[#5F5649]">摘要</label>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] px-4 py-2.5 text-sm focus:border-[#B9812F] focus:outline-none" placeholder="可选" />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-[#5F5649]">正文（Markdown）</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="w-full rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] px-4 py-2.5 text-sm font-mono leading-relaxed focus:border-[#B9812F] focus:outline-none" placeholder="支持 Markdown 格式..." />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-[#5F5649]">封面图片</label>
          <input type="file" accept="image/*" onChange={handleUpload} className="text-sm text-[#5F5649]" />
          {imageUrl && (
            <div className="mt-2 flex items-center gap-2">
              <img src={imageUrl} alt="preview" className="h-20 rounded-xl border object-cover" />
              <button type="button" onClick={() => setImageUrl('')} className="text-xs text-red-500 hover:underline">移除</button>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="rounded-xl bg-[#B9812F] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#8F5E1D] disabled:opacity-50">
            {saving ? '保存中...' : (isEdit ? '更新' : '发布')}
          </button>
          <button type="button" onClick={() => navigate('/admin/posts')} className="rounded-xl border border-[#E9DFCE] px-6 py-2.5 text-sm text-[#5F5649] hover:bg-[#F4E8D3]">取消</button>
        </div>
      </form>
    </div>
  );
}
