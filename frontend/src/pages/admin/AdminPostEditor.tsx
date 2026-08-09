/**
 * 管理后台文章编辑器（需登录）
 * URL: /admin/posts/new （新建） | /admin/posts/:postId/edit （编辑）
 *
 * react-hook-form + zod 校验；
 * 正文使用 @uiw/react-md-editor Markdown 编辑器；
 * 封面图上传（useUploadImage）即时预览；
 * 草稿 / 发布状态切换。
 */
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { toast } from 'sonner';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import {
  useAdminPost,
  useCreatePost,
  useUpdatePost,
  useUploadImage,
} from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useCategories';
import type { PostFormData } from '@/types';
import { getApiErrorDetail } from '@/lib/api-error';
import { useAdminMessage } from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ======================== 表单校验 ========================

const postSchema = z.object({
  title: z.string().min(1, '请输入文章标题').max(200, '标题不能超过 200 字'),
  slug: z
    .string()
    .max(200, 'slug 不能超过 200 字')
    .optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()),
  excerpt: z
    .string()
    .max(500, '摘要不能超过 500 字')
    .optional(),
  body: z.string().min(1, '请输入正文内容'),
  status: z.enum(['draft', 'published']),
  imageUrl: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

const defaultValues: PostFormValues = {
  title: '',
  slug: '',
  categoryId: '',
  tagIds: [],
  excerpt: '',
  body: '',
  status: 'draft',
  imageUrl: '',
};

export default function AdminPostEditor() {
  const { postId } = useParams<{ postId: string }>();
  const isEdit = postId !== undefined;
  const navigate = useNavigate();
  const { showMessage } = useAdminMessage();

  const { data: postData, isLoading: postLoading } = useAdminPost(postId);
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const uploadImage = useUploadImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues,
  });

  const { register, handleSubmit, control, watch, setValue, reset, formState } =
    form;

  // 编辑模式：文章数据就绪后回填表单
  useEffect(() => {
    if (!postData) return;
    reset({
      title: postData.title,
      slug: postData.slug,
      categoryId: postData.category?.id ?? '',
      tagIds: postData.tags.map((tag) => tag.id),
      excerpt: postData.excerpt,
      body: postData.body,
      status: postData.status,
      imageUrl: postData.image_url ?? '',
    });
  }, [postData, reset]);

  const imageUrl = watch('imageUrl');
  const selectedTagIds = watch('tagIds');

  function toggleTag(tagId: string) {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setValue('tagIds', next);
  }

  async function handleImageFile(file: File) {
    try {
      const result = await uploadImage.mutateAsync(file);
      setValue('imageUrl', result.url);
      toast.success('图片上传成功');
    } catch (error) {
      showMessage('error', getApiErrorDetail(error, '图片上传失败'));
    }
  }

  async function onSubmit(values: PostFormValues) {
    const payload: PostFormData = {
      title: values.title,
      slug: values.slug?.trim() || undefined,
      category_id: values.categoryId || undefined,
      tag_ids: values.tagIds,
      excerpt: values.excerpt?.trim() ?? '',
      body: values.body,
      status: values.status,
      image_url: values.imageUrl?.trim() || undefined,
    };

    try {
      if (isEdit && postId !== undefined) {
        await updatePost.mutateAsync({ id: postId, data: payload });
        showMessage('success', '文章已更新');
      } else {
        await createPost.mutateAsync(payload);
        showMessage('success', '文章已创建');
      }
      navigate('/admin/posts');
    } catch (error) {
      showMessage('error', getApiErrorDetail(error, '保存文章失败'));
    }
  }

  // 编辑模式加载中 / 出错
  if (isEdit && postLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-2xl tracking-[0.02em] text-text-primary">
          {isEdit ? '编辑文章' : '写文章'}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {isEdit ? '修改文章内容并保存' : '创建一篇新文章，可先存为草稿'}
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]"
      >
        {/* 左侧：正文 */}
        <Card className="gap-5 py-6">
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="post-title">标题 *</Label>
              <Input
                id="post-title"
                placeholder="请输入文章标题"
                aria-invalid={formState.errors.title !== undefined}
                {...register('title')}
              />
              {formState.errors.title && (
                <p className="text-xs text-danger">
                  {formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-body">正文（Markdown）*</Label>
              <Controller
                control={control}
                name="body"
                render={({ field }) => (
                  <div data-color-mode="light">
                    <MDEditor
                      value={field.value}
                      onChange={(value) => field.onChange(value ?? '')}
                      height={440}
                      preview="live"
                      textareaProps={{ placeholder: '使用 Markdown 编写正文…' }}
                    />
                  </div>
                )}
              />
              {formState.errors.body && (
                <p className="text-xs text-danger">
                  {formState.errors.body.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 右侧：文章信息 */}
        <div className="space-y-6">
          <Card className="gap-5 py-6">
            <CardHeader className="px-6 py-0">
              <CardTitle className="text-base">发布设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="post-slug">URL 标识（slug）</Label>
                <Input
                  id="post-slug"
                  placeholder="留空则自动从标题生成"
                  {...register('slug')}
                />
                {formState.errors.slug ? (
                  <p className="text-xs text-danger">
                    {formState.errors.slug.message}
                  </p>
                ) : (
                  <p className="text-xs text-text-muted">
                    用于文章链接地址，仅支持字母、数字与连字符
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={watch('categoryId')}
                  onValueChange={(value) => setValue('categoryId', value)}
                >
                  <SelectTrigger className="w-full" aria-label="选择分类">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未分类</SelectItem>
                    {(categories ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>标签</Label>
                {(tags ?? []).length === 0 ? (
                  <p className="text-xs text-text-muted">暂无标签可选</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(tags ?? []).map((tag) => {
                      const selected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-sm transition-colors',
                            selected
                              ? 'border-primary-500 bg-primary-600 text-white'
                              : 'border-border-default bg-bg-surface text-text-soft hover:border-primary-300'
                          )}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>状态</Label>
                <div className="flex gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-text-soft">
                    <input
                      type="radio"
                      value="draft"
                      className="size-4 accent-primary"
                      {...register('status')}
                    />
                    草稿
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-text-soft">
                    <input
                      type="radio"
                      value="published"
                      className="size-4 accent-primary"
                      {...register('status')}
                    />
                    发布
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-5 py-6">
            <CardHeader className="px-6 py-0">
              <CardTitle className="text-base">封面图</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageFile(file);
                  e.target.value = '';
                }}
              />
              {imageUrl ? (
                <div className="relative overflow-hidden rounded-lg border border-border-default">
                  <img
                    src={imageUrl}
                    alt="封面预览"
                    className="h-36 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setValue('imageUrl', '')}
                    className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    aria-label="移除封面图"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadImage.isPending}
                  className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-default text-text-muted transition-colors hover:border-primary-400 hover:text-primary-700 disabled:opacity-60"
                >
                  {uploadImage.isPending ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <ImagePlus className="size-6" />
                  )}
                  <span className="text-sm">
                    {uploadImage.isPending ? '上传中…' : '点击上传封面图'}
                  </span>
                </button>
              )}
            </CardContent>
          </Card>

          <Card className="gap-5 py-6">
            <CardHeader className="px-6 py-0">
              <CardTitle className="text-base">摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="文章摘要，展示在列表与卡片中（可选）"
                rows={4}
                aria-invalid={formState.errors.excerpt !== undefined}
                {...register('excerpt')}
              />
              {formState.errors.excerpt && (
                <p className="mt-1 text-xs text-danger">
                  {formState.errors.excerpt.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={formState.isSubmitting}
              className="flex-1 bg-gradient-to-r from-gradient-from to-gradient-to text-white shadow-md shadow-primary/25 hover:from-gradient-from-hover hover:to-gradient-to-hover"
            >
              {formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isEdit ? '保存修改' : '保存文章'}
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/admin/posts">
                <X />
                取消
              </Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
