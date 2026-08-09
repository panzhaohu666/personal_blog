/**
 * 管理后台文章列表（需登录）
 * URL: /admin/posts
 *
 * 筛选栏（状态 / 分类 / 标题搜索）+ 文章表格 + 删除确认 + 分页。
 * 状态与分类筛选在当前页结果上客户端过滤（后端管理列表暂不支持），
 * 搜索与分页由服务端处理；筛选条件全部保存在 URL 查询参数中。
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Inbox, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAdminPosts, useDeletePost } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import type { PostSummary } from '@/types';
import { getApiErrorDetail } from '@/lib/api-error';
import { useAdminMessage } from './AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

type StatusFilter = '' | 'published' | 'draft';

export default function AdminPostList() {
  const { showMessage } = useAdminMessage();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('search') ?? '';
  const status = (searchParams.get('status') ?? '') as StatusFilter;
  const categorySlug = searchParams.get('category') ?? '';

  const [searchInput, setSearchInput] = useState(search);
  const [deleteTarget, setDeleteTarget] = useState<PostSummary | null>(null);

  const { data, isLoading } = useAdminPosts({
    page,
    size: PAGE_SIZE,
    search: search || undefined,
  });
  const { data: categories } = useCategories();
  const deletePost = useDeletePost();

  // 服务端分页结果 + 客户端状态/分类过滤
  const visibleItems = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((post) => {
      const matchesStatus = status === '' || post.status === status;
      const matchesCategory =
        categorySlug === '' || post.category?.slug === categorySlug;
      return matchesStatus && matchesCategory;
    });
  }, [data, status, categorySlug]);

  function updateParams(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({ search: searchInput.trim() || undefined, page: undefined });
  }

  function handleReset() {
    setSearchInput('');
    setSearchParams({});
  }

  function buildHref(
    overrides: Record<string, string | undefined>
  ): string {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const query = params.toString();
    return query ? `/admin/posts?${query}` : '/admin/posts';
  }

  function confirmDelete() {
    if (deleteTarget === null) return;
    deletePost.mutate(deleteTarget.id, {
      onSuccess: () => {
        showMessage('success', `文章《${deleteTarget.title}》已删除`);
        setDeleteTarget(null);
      },
      onError: (error) => {
        showMessage('error', getApiErrorDetail(error, '删除文章失败'));
        setDeleteTarget(null);
      },
    });
  }

  // 分页页码序列（首/末页 + 当前页附近）
  const totalPages = data?.pages ?? 1;
  const pageItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const set = new Set<number>([1, totalPages, page - 1, page, page + 1]);
    const sorted = [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const result: (number | 'ellipsis')[] = [];
    for (let i = 0; i < sorted.length; i += 1) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        result.push('ellipsis');
      }
      result.push(sorted[i]);
    }
    return result;
  }, [totalPages, page]);

  return (
    <div>
      {/* 页面头部 */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl tracking-[0.02em] text-text-primary">
            文章管理
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            共 {data?.total ?? 0} 篇文章，含草稿
          </p>
        </div>
        <Button asChild className="bg-primary-600 hover:bg-primary-700">
          <Link to="/admin/posts/new">
            <Plus />
            写文章
          </Link>
        </Button>
      </header>

      {/* 筛选栏 */}
      <form
        onSubmit={handleSearchSubmit}
        className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm"
      >
        <Select
          value={status}
          onValueChange={(value: StatusFilter) =>
            updateParams({ status: value || undefined, page: undefined })
          }
        >
          <SelectTrigger className="w-32" aria-label="按状态筛选">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部状态</SelectItem>
            <SelectItem value="published">已发布</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categorySlug}
          onValueChange={(value) =>
            updateParams({ category: value || undefined, page: undefined })
          }
        >
          <SelectTrigger className="w-40" aria-label="按分类筛选">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部分类</SelectItem>
            {(categories ?? []).map((category) => (
              <SelectItem key={category.id} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex min-w-52 flex-1 gap-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="按标题搜索…"
            aria-label="按标题搜索"
          />
          <Button type="submit" variant="secondary">
            <Search />
            搜索
          </Button>
          {(status !== '' || categorySlug !== '' || search !== '') && (
            <Button type="button" variant="ghost" onClick={handleReset}>
              重置
            </Button>
          )}
        </div>
      </form>

      {/* 文章表格 */}
      <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-5 text-xs font-semibold tracking-wider text-text-muted uppercase">
                标题
              </TableHead>
              <TableHead className="px-5 text-xs font-semibold tracking-wider text-text-muted uppercase">
                分类
              </TableHead>
              <TableHead className="px-5 text-xs font-semibold tracking-wider text-text-muted uppercase">
                状态
              </TableHead>
              <TableHead className="px-5 text-xs font-semibold tracking-wider text-text-muted uppercase">
                日期
              </TableHead>
              <TableHead className="px-5 text-right text-xs font-semibold tracking-wider text-text-muted uppercase">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell className="px-5 py-3">
                    <div className="h-4 w-48 animate-pulse rounded bg-primary-100" />
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-primary-100" />
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="h-5 w-14 animate-pulse rounded-full bg-primary-100" />
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-primary-100" />
                  </TableCell>
                  <TableCell className="px-5 py-3" />
                </TableRow>
              ))}

            {!isLoading && visibleItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-5 py-14 text-center">
                  <Inbox className="mx-auto size-10 text-text-muted" />
                  <p className="mt-3 text-sm text-text-muted">
                    没有找到符合条件的文章
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              visibleItems.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-72 px-5 py-3">
                    <Link
                      to={`/admin/posts/${post.id}/edit`}
                      className="line-clamp-1 font-medium text-text-primary hover:text-primary-700"
                    >
                      {post.title}
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-text-soft">
                    {post.category?.name ?? (
                      <span className="text-text-muted">未分类</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    {post.status === 'published' ? (
                      <Badge className="bg-success-bg text-success-text">
                        已发布
                      </Badge>
                    ) : (
                      <Badge className="bg-warning-bg text-warning-text">
                        草稿
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-text-soft">
                    {format(new Date(post.created_at), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-text-soft"
                      >
                        <Link to={`/admin/posts/${post.id}/edit`}>
                          <Pencil />
                          编辑
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(post)}
                        className="text-danger hover:border-danger hover:bg-error-bg hover:text-danger"
                      >
                        <Trash2 />
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {/* 分页 */}
        {!isLoading && totalPages > 1 && (
          <div className="border-t border-border-default py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={page <= 1}
                    className={cn(page <= 1 && 'pointer-events-none opacity-50')}
                    href={buildHref({ page: String(page - 1) })}
                  />
                </PaginationItem>
                {pageItems.map((item, index) =>
                  item === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        isActive={item === page}
                        href={buildHref({ page: String(item) })}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    aria-disabled={page >= totalPages}
                    className={cn(
                      page >= totalPages && 'pointer-events-none opacity-50'
                    )}
                    href={buildHref({ page: String(page + 1) })}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除文章</DialogTitle>
            <DialogDescription>
              确定要删除《{deleteTarget?.title}》吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
