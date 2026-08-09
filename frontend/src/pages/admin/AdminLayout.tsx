import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV = [
  { to: '/admin', label: '工作台' },
  { to: '/admin/posts/new', label: '写文章' },
  { to: '/admin/posts', label: '文章管理' },
  { to: '/admin/categories', label: '分类管理' },
  { to: '/admin/tags', label: '标签管理' },
  { to: '/admin/system', label: '系统管理' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navActive = (path: string) => {
    if (path === '/admin/posts/new') return location.pathname === '/admin/posts/new';
    if (path === '/admin/posts') return location.pathname.startsWith('/admin/posts') && location.pathname !== '/admin/posts/new';
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F2E9]">
      {/* 移动端遮罩 */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      {/* 侧边栏 */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-gradient-to-b from-[#302A23] to-[#26211B] transition-transform lg:relative lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="border-b border-white/10 px-6 py-5">
          <Link to="/blog" className="font-serif text-lg font-semibold text-[#FBF6EC]">个人博客</Link>
          <p className="mt-0.5 text-xs text-[#8F8677]">管理后台</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition ${navActive(item.to) ? 'border-l-2 border-[#B9812F] bg-white/10 font-medium text-[#FBF6EC]' : 'text-[#BDB19E] hover:bg-white/5 hover:text-[#FBF6EC]'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-4 space-y-1">
          <Link to="/blog" target="_blank" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-[#BDB19E] hover:bg-white/5 hover:text-[#FBF6EC]">🌐 查看网站</Link>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-[#BDB19E] hover:bg-white/5 hover:text-[#FBF6EC]">🚪 退出登录</button>
        </div>
      </aside>
      {/* 主内容 */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#E9DFCE] bg-[#FFFDF8] px-6 py-3">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1 text-[#5F5649] hover:bg-[#F4E8D3] lg:hidden">☰</button>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-[#5F5649]">{user?.username}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#C38B36] to-[#9A6320] text-sm font-bold text-white">{(user?.username || '?')[0].toUpperCase()}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
