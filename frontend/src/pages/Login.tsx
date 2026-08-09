import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(redirect, { replace: true });
  }, [isAuthenticated, navigate, redirect]);

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-[#F7F2E9] text-[#8E8375]">检查登录状态...</div>;
  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('请输入用户名和密码'); return; }
    setSubmitting(true);
    try {
      await login({ username, password });
      navigate(redirect, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登录失败';
      setError(msg.includes('401') ? '用户名或密码错误' : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F2E9] px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-[#E9DFCE] bg-[#FFFDF8] shadow-lg">
        <div className="h-1.5 bg-gradient-to-r from-[#C38B36] to-[#9A6320]" />
        <div className="p-8">
          <h1 className="mb-2 text-center font-serif text-2xl font-bold text-[#2B2620]">个人博客</h1>
          <p className="mb-6 text-center text-sm text-[#8E8375]">管理后台</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名" autoFocus
              className="rounded-lg border border-[#E9DFCE] bg-[#F7F2E9] px-4 py-2.5 text-sm focus:border-[#B9812F] focus:outline-none"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="rounded-lg border border-[#E9DFCE] bg-[#F7F2E9] px-4 py-2.5 text-sm focus:border-[#B9812F] focus:outline-none"
            />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-gradient-to-r from-[#C38B36] to-[#9A6320] py-2.5 text-sm font-semibold tracking-wider text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? '登录中...' : '登 录'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link to="/blog" className="text-[#8E8375] hover:text-[#B9812F]">← 返回博客首页</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
