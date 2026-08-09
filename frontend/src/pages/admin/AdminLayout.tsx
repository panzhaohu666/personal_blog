/**
 * 管理后台布局（需登录）
 * URL: /admin/*
 *
 * 固定 240px 深棕侧边栏（沿袭 Django 后台 #302A23 渐变），
 * 琥珀色激活态 + 左侧高亮边条，移动端汉堡抽屉切换。
 * 内容区为暖色背景，顶部渲染 Django 风格的 messages 消息区。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ExternalLink,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  SquarePen,
  Tags,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ======================== 消息区（Django messages 风格） ========================

type AdminMessageType = 'success' | 'error';

interface AdminMessage {
  id: number;
  type: AdminMessageType;
  text: string;
}

interface AdminMessageContextValue {
  showMessage: (type: AdminMessageType, text: string) => void;
}

const AdminMessageContext = createContext<AdminMessageContextValue | undefined>(
  undefined
);

/**
 * 在管理后台内容区顶部显示一条 Django 风格消息
 * 成功（绿色）/ 错误（红色），约 4.5 秒后自动消失。
 */
export function useAdminMessage(): AdminMessageContextValue {
  const context = useContext(AdminMessageContext);
  if (context === undefined) {
    throw new Error('useAdminMessage 必须在 AdminLayout 内部使用');
  }
  return context;
}

// ======================== 导航配置 ========================

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/admin', label: '工作台', icon: LayoutDashboard, exact: true },
  { path: '/admin/posts/new', label: '写文章', icon: SquarePen, exact: true },
  { path: '/admin/posts', label: '文章管理', icon: FileText },
  { path: '/admin/categories', label: '分类管理', icon: FolderOpen },
  { path: '/admin/tags', label: '标签管理', icon: Tags },
  { path: '/admin/system', label: '系统管理', icon: Settings },
];

// ======================== 布局组件 ========================

export default function AdminLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const nextMessageId = useRef(0);

  // 路由切换时自动收起移动端抽屉
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const showMessage = useCallback((type: AdminMessageType, text: string) => {
    const id = ++nextMessageId.current;
    setMessages((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 4500);
  }, []);

  const messageContextValue = useMemo<AdminMessageContextValue>(
    () => ({ showMessage }),
    [showMessage]
  );

  function isNavActive(item: NavItem): boolean {
    if (item.exact) {
      return location.pathname === item.path;
    }
    // 文章管理是列表页，其子路由（新建/编辑）也视为激活
    return location.pathname.startsWith(item.path + '/');
  }

  const sidebar = (
    <aside className="flex h-full w-[240px] flex-col bg-gradient-to-b from-sidebar to-sidebar-deep text-sidebar-ink">
      {/* 品牌区 */}
      <div className="border-b border-sidebar-line px-6 pt-7 pb-5">
        <h2 className="font-serif text-[21px] tracking-[0.03em] text-sidebar-title">
          个人博客
        </h2>
        <span className="mt-1 block text-xs tracking-[0.08em] text-sidebar-muted">
          管理后台
        </span>
      </div>

      {/* 导航 */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex items-center gap-3 border-l-[3px] border-transparent px-6 py-3 text-sm transition-colors',
                active
                  ? 'border-l-sidebar-bright bg-primary/15 text-sidebar-bright'
                  : 'hover:bg-sidebar-hover hover:text-sidebar-title'
              )}
            >
              <Icon className="size-[18px] opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 底部操作 */}
      <div className="space-y-2 border-t border-sidebar-line px-6 py-4">
        <a
          href="/blog"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-sidebar-bright transition-all hover:translate-x-0.5 hover:text-sidebar-title"
        >
          <ExternalLink className="size-4" />
          查看网站
        </a>
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-2 text-sm text-sidebar-ink transition-all hover:translate-x-0.5 hover:text-sidebar-bright"
        >
          <LogOut className="size-4" />
          退出登录
        </button>
      </div>
    </aside>
  );

  return (
    <AdminMessageContext.Provider value={messageContextValue}>
      <div className="min-h-screen bg-bg-warm">
        {/* 桌面端固定侧边栏 */}
        <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>

        {/* 移动端抽屉 + 遮罩 */}
        <div
          className={cn(
            'fixed inset-0 z-50 transition-opacity lg:hidden',
            sidebarOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0'
          )}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={cn(
              'absolute inset-y-0 left-0 shadow-2xl transition-transform duration-200',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 -right-10 rounded-md bg-sidebar p-2 text-sidebar-ink"
              aria-label="关闭菜单"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>

        {/* 移动端顶栏 */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border-default bg-bg-surface px-4 py-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开菜单"
          >
            <Menu className="size-5" />
          </Button>
          <span className="font-semibold text-text-primary">
            个人博客 · 管理后台
          </span>
        </header>

        {/* 主内容区 */}
        <main className="px-5 py-6 sm:px-8 lg:ml-[240px] lg:px-12 lg:py-10">
          {/* Django 风格消息区 */}
          {messages.length > 0 && (
            <div className="mb-6 space-y-2" aria-live="polite">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm',
                    message.type === 'success'
                      ? 'border-success-border bg-success-bg text-success-text'
                      : 'border-error-border bg-error-bg text-danger'
                  )}
                >
                  {message.text}
                </div>
              ))}
            </div>
          )}

          <Outlet />
        </main>
      </div>
    </AdminMessageContext.Provider>
  );
}
