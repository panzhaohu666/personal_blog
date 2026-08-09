import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * 应用根组件
 *
 * 包裹全局 Provider（路由、React Query、认证），
 * 定义所有路由映射。
 *
 * 路由设计：
 * - /blog                    → 博客文章列表（公开）
 * - /blog/post/:slug         → 文章详情（公开）
 * - /blog/category/:slug     → 分类筛选（公开）
 * - /admin                   → 管理后台工作台（需登录）
 * - /admin/posts             → 文章管理（需登录）
 * - /admin/posts/new         → 写文章（需登录）
 * - /admin/posts/:postId/edit→ 编辑文章（需登录）
 * - /admin/categories        → 分类管理（需登录）
 * - /admin/tags              → 标签管理（需登录）
 * - /admin/system            → 系统管理（需登录）
 * - /login                   → 登录页面（公开）
 * - /                        → 重定向到 /blog
 * - *                        → 404 页面
 */

// 懒加载页面组件 —— 按需加载，减小首屏体积
const BlogListPage = lazy(() => import('@/pages/BlogList'));
const BlogPostPage = lazy(() => import('@/pages/BlogPost'));
const BlogCategoryPage = lazy(() => import('@/pages/BlogCategory'));
const LoginPage = lazy(() => import('@/pages/Login'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

// 管理后台页面（懒加载）
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminPostList = lazy(() => import('@/pages/admin/AdminPostList'));
const AdminPostEditor = lazy(() => import('@/pages/admin/AdminPostEditor'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminTags = lazy(() => import('@/pages/admin/AdminTags'));
const AdminSystem = lazy(() => import('@/pages/admin/AdminSystem'));

/**
 * 页面加载中的占位组件
 * 显示暖色调的加载提示
 */
function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-warm)]">
      <p className="text-[var(--color-text-muted)]">加载中...</p>
    </div>
  );
}

/**
 * React Query 客户端配置
 * - staleTime: 5 分钟 —— 数据在此时间内被认为是新鲜的，不会重新请求
 * - retry: 失败后重试 2 次
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      retry: 2,
    },
  },
});

/**
 * App 组件 —— 整个应用的根
 * 组装所有全局 Provider 和路由表
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* 根路径重定向到博客首页 */}
              <Route path="/" element={<Navigate to="/blog" replace />} />

              {/* 博客前端路由（公开访问） */}
              <Route path="/blog" element={<BlogListPage />} />
              <Route path="/blog/post/:slug" element={<BlogPostPage />} />
              <Route
                path="/blog/category/:slug"
                element={<BlogCategoryPage />}
              />

              {/* 管理后台路由（需登录，嵌套在 AdminLayout 侧边栏中） */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="posts" element={<AdminPostList />} />
                <Route path="posts/new" element={<AdminPostEditor />} />
                <Route path="posts/:postId/edit" element={<AdminPostEditor />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="tags" element={<AdminTags />} />
                <Route path="system" element={<AdminSystem />} />
              </Route>

              {/* 登录页 */}
              <Route path="/login" element={<LoginPage />} />

              {/* 404 页面 —— 匹配所有未定义路由 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        {/* Toast 通知系统（sonner） */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-default)',
            },
          }}
        />
      </AuthProvider>

      {/* React Query Devtools —— 仅在开发环境显示 */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
