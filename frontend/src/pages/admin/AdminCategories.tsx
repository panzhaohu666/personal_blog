/**
 * 管理后台分类管理（需登录）
 * URL: /admin/categories
 *
 * 内联添加表单 + 分类表格（名称/文章数/操作）+ 删除确认 + 空状态。
 */
import { useState, type FormEvent } from 'react';
import { FolderPlus, Inbox, Trash2 } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories';
import type { Category } from '@/types';
import { getApiErrorDetail } from '@/lib/api-error';
import { useAdminMessage } from './AdminLayout';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminCategories() {
  const { showMessage } = useAdminMessage();
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setNameError('请输入分类名称');
      return;
    }
    if (trimmed.length > 100) {
      setNameError('分类名称不能超过 100 字');
      return;
    }
    setNameError(null);
    createCategory.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName('');
          showMessage('success', `分类「${trimmed}」已创建`);
        },
        onError: (error) => {
          showMessage('error', getApiErrorDetail(error, '创建分类失败'));
        },
      }
    );
  }

  function confirmDelete() {
    if (deleteTarget === null) return;
    deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => {
        showMessage('success', `分类「${deleteTarget.name}」已删除`);
        setDeleteTarget(null);
      },
      onError: (error) => {
        showMessage('error', getApiErrorDetail(error, '删除分类失败'));
        setDeleteTarget(null);
      },
    });
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-2xl tracking-[0.02em] text-text-primary">
          分类管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          共 {categories?.length ?? 0} 个分类
        </p>
      </header>

      {/* 内联添加表单 */}
      <form
        onSubmit={handleAdd}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <label
            htmlFor="category-name"
            className="text-sm font-medium text-text-soft"
          >
            新分类名称
          </label>
          <Input
            id="category-name"
            placeholder="例如：技术笔记"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError !== null) setNameError(null);
            }}
            aria-invalid={nameError !== null}
          />
          {nameError !== null && (
            <p className="text-xs text-danger">{nameError}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={createCategory.isPending}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <FolderPlus />
          {createCategory.isPending ? '添加中…' : '添加分类'}
        </Button>
      </form>

      {/* 分类表格 */}
      <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-5 text-xs font-semibold tracking-wider text-text-muted uppercase">
                名称
              </TableHead>
              <TableHead className="px-5 text-xs font-semibold tracking-wider text-text-muted uppercase">
                文章数
              </TableHead>
              <TableHead className="px-5 text-right text-xs font-semibold tracking-wider text-text-muted uppercase">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell className="px-5 py-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-primary-100" />
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="h-4 w-10 animate-pulse rounded bg-primary-100" />
                  </TableCell>
                  <TableCell className="px-5 py-3" />
                </TableRow>
              ))}

            {!isLoading && (categories ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="px-5 py-14 text-center">
                  <Inbox className="mx-auto size-10 text-text-muted" />
                  <p className="mt-3 text-sm text-text-muted">暂无分类</p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              (categories ?? []).map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="px-5 py-3 font-medium text-text-primary">
                    {category.name}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-text-soft">
                    {category.post_count}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(category)}
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
      </div>

      {/* 删除确认 */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除分类</DialogTitle>
            <DialogDescription>
              确定要删除分类「{deleteTarget?.name}」吗？该分类下的文章将变为未分类。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
