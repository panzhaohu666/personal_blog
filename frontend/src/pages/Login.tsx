/**
 * 登录页面（公开访问）
 * URL: /login
 *
 * 暖色系登录卡片：纸纹背景 + 琥珀渐变顶栏。
 * 登录成功后跳转回 ?redirect= 指定的页面（默认 /admin）。
 */
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorDetail } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  // 仅允许站内相对路径，防止开放重定向
  const redirect =
    redirectParam !== null && redirectParam.startsWith('/')
      ? redirectParam
      : '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 正在恢复登录状态：显示加载动画
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-warm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 已登录用户访问登录页：直接跳转目标页面
  if (isAuthenticated) {
    return <Navigate to={redirect} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(getApiErrorDetail(err, '登录失败，请检查用户名和密码'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-bg-warm px-4"
      style={{
        backgroundImage:
          'radial-gradient(rgba(185, 129, 47, 0.07) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      <div className="w-[400px] max-w-[92vw] overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-lg">
        {/* 琥珀渐变顶栏 */}
        <div className="h-2 bg-gradient-to-r from-gradient-from via-primary to-gradient-to" />

        <div className="p-8">
          <h1 className="text-center text-2xl font-bold tracking-wide text-text-primary">
            个人博客
          </h1>
          <p className="mt-1 text-center text-sm text-text-muted">
            管理后台登录
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error !== null && (
              <div className="rounded-lg border border-error-border bg-error-bg px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || username.length === 0 || password.length === 0}
              className="h-11 w-full bg-gradient-to-r from-gradient-from to-gradient-to text-[15px] font-semibold tracking-[0.3em] text-white shadow-md shadow-primary/25 hover:from-gradient-from-hover hover:to-gradient-to-hover disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '登 录'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-text-muted">
            <Link to="/blog" className="underline-offset-2 hover:underline">
              返回博客首页
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
