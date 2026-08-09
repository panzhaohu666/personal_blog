import { useState, useEffect } from 'react';

export function ThemeToggle({ className = 'text-sm text-[#8E8375] dark:text-gray-400 hover:text-[#B9812F]' }: { className?: string }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.theme = dark ? 'dark' : 'light';
  }, [dark]);
  return <button onClick={() => setDark(!dark)} className={className} aria-label="切换主题">{dark ? '🌙' : '☀️'}</button>;
}
