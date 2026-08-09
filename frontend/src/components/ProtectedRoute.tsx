import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

/**
 * ProtectedRoute —— 需要登录才能访问的路由守卫
 *
 * 行为：
 * - 正在检查登录状态 → 显示加载动画
 * - 未登录 → 重定向到 /login?redirect=原路径
 * - 已登录 → 渲染子组件
 *
 * 使用 TanStack Query 的 isLoading 状态避免闪烁
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F2E9]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
