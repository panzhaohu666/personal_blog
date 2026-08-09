interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  onSearch: (q: string) => void;
  className?: string;
}

export function SearchBar({ defaultValue = '', placeholder = '搜索...', onSearch, className = '' }: SearchBarProps) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); const q = (new FormData(e.currentTarget).get('q') as string).trim(); onSearch(q); }} className={`flex gap-2 ${className}`}>
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-[#E9DFCE] dark:border-gray-600 bg-[#FFFDF8] dark:bg-gray-800 px-4 py-2 text-sm text-[#2B2620] dark:text-gray-100 focus:border-[#B9812F] focus:outline-none placeholder:text-[#8E8375]"
      />
      <button type="submit" className="rounded-xl bg-[#B9812F] dark:bg-amber-600 px-5 py-2 text-sm text-white hover:bg-[#8F5E1D] dark:hover:bg-amber-500">
        搜索
      </button>
    </form>
  );
}
