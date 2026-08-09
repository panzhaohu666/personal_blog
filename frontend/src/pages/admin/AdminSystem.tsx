import { useState, useEffect } from 'react';
import apiClient from '@/api/client';
import { useAuth } from '@/hooks/useAuth';

export default function AdminSystem() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => { if (user?.email) setEmail(user.email); }, [user?.email]);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put('/api/auth/email', { email });
      setMsg({ type: 'success', text: '邮箱修改成功' });
    } catch { setMsg({ type: 'error', text: '邮箱修改失败' }); }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) { setMsg({ type: 'error', text: '新密码至少 6 位' }); return; }
    if (newPw !== confirmPw) { setMsg({ type: 'error', text: '两次密码不一致' }); return; }
    try {
      await apiClient.put('/api/auth/password', { old_password: oldPw, new_password: newPw, confirm_password: confirmPw });
      setMsg({ type: 'success', text: '密码修改成功' }); setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') setMsg({ type: 'error', text: detail });
      else if (Array.isArray(detail)) setMsg({ type: 'error', text: detail.map((d: any) => d.msg).join('; ') });
      else setMsg({ type: 'error', text: '修改失败，请确认旧密码正确' });
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl font-bold text-[#2B2620] dark:text-gray-100">系统设置</h1>
      {msg && <div className={`rounded-xl p-3 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>}
      <form onSubmit={handleEmail} className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-[#2B2620] dark:text-gray-100">修改邮箱</h2>
        <p className="mb-3 text-xs text-[#8E8375] dark:text-gray-400">当前邮箱：{user?.email || '未设置'}</p>
        <div className="flex flex-col gap-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="新邮箱" className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#F7F2E9] dark:bg-gray-900 px-3 py-2 text-sm focus:border-[#B9812F] focus:outline-none" />
          <button type="submit" className="rounded-xl bg-[#B9812F] px-4 py-2 text-sm text-white hover:bg-[#8F5E1D] self-start">保存</button>
        </div>
      </form>
      <form onSubmit={handlePassword} className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-[#2B2620] dark:text-gray-100">修改密码</h2>
        <div className="flex flex-col gap-3">
          <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="旧密码" className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#F7F2E9] dark:bg-gray-900 px-3 py-2 text-sm focus:border-[#B9812F] focus:outline-none" />
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="新密码" className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#F7F2E9] dark:bg-gray-900 px-3 py-2 text-sm focus:border-[#B9812F] focus:outline-none" />
          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="确认新密码" className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#F7F2E9] dark:bg-gray-900 px-3 py-2 text-sm focus:border-[#B9812F] focus:outline-none" />
          <button type="submit" className="rounded-xl bg-[#B9812F] px-4 py-2 text-sm text-white hover:bg-[#8F5E1D] self-start">修改</button>
        </div>
      </form>
    </div>
  );
}
