import { useNavigate } from 'react-router-dom';
import type { MouseEvent } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

interface PostsPaginationProps {
  page: number;
  pages: number;
  /** 生成指定页码的完整链接（保留当前查询参数） */
  buildHref: (page: number) => string;
}

type PageItem = number | 'ellipsis-left' | 'ellipsis-right';

function getPageItems(page: number, pages: number): PageItem[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }
  const items: PageItem[] = [1];
  if (page > 4) items.push('ellipsis-left');
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  for (let i = start; i <= end; i++) items.push(i);
  if (page < pages - 3) items.push('ellipsis-right');
  items.push(pages);
  return items;
}

/**
 * 分页栏 —— 基于 shadcn Pagination，带省略号窗口
 * 通过 onClick 拦截默认跳转，使用 react-router 无刷新导航
 */
export function PostsPagination({ page, pages, buildHref }: PostsPaginationProps) {
  const navigate = useNavigate();

  if (pages <= 1) return null;

  const goTo = (target: number) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (target !== page) {
      navigate(buildHref(target));
    }
  };

  return (
    <Pagination className="mt-10">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={buildHref(Math.max(1, page - 1))}
            onClick={goTo(page - 1)}
            className={cn(
              page <= 1 && 'pointer-events-none opacity-40'
            )}
            aria-disabled={page <= 1}
          />
        </PaginationItem>

        {getPageItems(page, pages).map((item) => {
          if (item === 'ellipsis-left' || item === 'ellipsis-right') {
            return (
              <PaginationItem key={item}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }
          return (
            <PaginationItem key={item}>
              <PaginationLink
                href={buildHref(item)}
                onClick={goTo(item)}
                isActive={item === page}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            href={buildHref(Math.min(pages, page + 1))}
            onClick={goTo(page + 1)}
            className={cn(
              page >= pages && 'pointer-events-none opacity-40'
            )}
            aria-disabled={page >= pages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
