import { useState, useEffect } from 'react';

export function ThemeToggle({ className = 'text-sm text-muted hover:text-primary' }: { className?: string }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.theme = dark ? 'dark' : 'light';
  }, [dark]);
  return <button onClick={() => setDark(!dark)} className={className} aria-label="切换主题">{dark ? '🌙' : '☀️'}</button>;
}
