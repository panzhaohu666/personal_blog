/**
 * 管理后台标签管理（需登录）
 * URL: /admin/tags
 *
 * 内联添加表单 + 标签表格（名称/文章数/操作）+ 删除确认 + 空状态。
 */
import { useState, type FormEvent } from 'react';
import { Inbox, TagPlus, Trash2 } from 'lucide-react';
import {
  useTags,
  useCreateTag,
  useDeleteTag,
} from '@/hooks/useCategories';
import type { Tag } from '@/types';
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

export default function AdminTags() {
  const { showMessage } = useAdminMessage();
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setNameError('请输入标签名称');
      return;
    }
    if (trimmed.length > 50) {
      setNameError('标签名称不能超过 50 字');
      return;
    }
    setNameError(null);
    createTag.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName('');
          showMessage('success', `标签「${trimmed}」已创建`);
        },
        onError: (error) => {
          showMessage('error', getApiErrorDetail(error, '创建标签失败'));
        },
      }
    );
  }

  function confirmDelete() {
    if (deleteTarget === null) return;
    deleteTag.mutate(deleteTarget.id, {
      onSuccess: () => {
        showMessage('success', `标签「${deleteTarget.name}」已删除`);
        setDeleteTarget(null);
      },
      onError: (error) => {
        showMessage('error', getApiErrorDetail(error, '删除标签失败'));
        setDeleteTarget(null);
      },
    });
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-2xl tracking-[0.02em] text-text-primary">
          标签管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          共 {tags?.length ?? 0} 个标签
        </p>
      </header>

      {/* 内联添加表单 */}
      <form
        onSubmit={handleAdd}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <label
            htmlFor="tag-name"
            className="text-sm font-medium text-text-soft"
          >
            新标签名称
          </label>
          <Input
            id="tag-name"
            placeholder="例如：Python"
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
          disabled={createTag.isPending}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <TagPlus />
          {createTag.isPending ? '添加中…' : '添加标签'}
        </Button>
      </form>

      {/* 标签表格 */}
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
                    <div className="h-4 w-28 animate-pulse rounded bg-primary-100" />
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="h-4 w-10 animate-pulse rounded bg-primary-100" />
                  </TableCell>
                  <TableCell className="px-5 py-3" />
                </TableRow>
              ))}

            {!isLoading && (tags ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="px-5 py-14 text-center">
                  <Inbox className="mx-auto size-10 text-text-muted" />
                  <p className="mt-3 text-sm text-text-muted">暂无标签</p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              (tags ?? []).map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="px-5 py-3 font-medium text-text-primary">
                    {tag.name}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-text-soft">
                    {tag.post_count}
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(tag)}
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
            <DialogTitle>删除标签</DialogTitle>
            <DialogDescription>
              确定要删除标签「{deleteTarget?.name}」吗？文章与标签的关联将被移除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteTag.isPending}
            >
              {deleteTag.isPending ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
