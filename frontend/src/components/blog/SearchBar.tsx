import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  /** 初始搜索词（从 URL query 恢复） */
  initial?: string;
  /** 提交搜索词（空字符串表示清除搜索） */
  onSearch: (query: string) => void;
}

/**
 * 搜索栏 —— 输入框 + 搜索按钮，回车或点击按钮触发 onSearch
 */
export function SearchBar({ initial = '', onSearch }: SearchBarProps) {
  const [value, setValue] = useState(initial);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} role="search" className="flex w-full gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="搜索文章…"
          aria-label="搜索文章"
          className="h-10 rounded-xl border-[var(--color-border-default)] bg-[var(--color-bg-surface)] pl-9 shadow-card focus-visible:border-[var(--color-primary)]"
        />
      </div>
      <Button
        type="submit"
        className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-[var(--color-bg-surface)] transition-colors hover:bg-[var(--color-primary-dark)]"
      >
        搜索
      </Button>
    </form>
  );
}
