/**
 * 管理后台系统管理（需登录）
 * URL: /admin/system
 *
 * 邮箱修改 + 密码修改两个表单卡片，
 * 直接使用 apiClient 调用 PUT /api/auth/email 与 PUT /api/auth/password。
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Loader2, Mail } from 'lucide-react';
import apiClient from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import type { ChangeEmailRequest, ChangePasswordRequest } from '@/types';
import { getApiErrorDetail } from '@/lib/api-error';
import { useAdminMessage } from './AdminLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ======================== 表单校验 ========================

const emailSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const passwordSchema = z
  .object({
    old_password: z.string().min(1, '请输入当前密码'),
    new_password: z.string().min(6, '新密码至少 6 位'),
    confirm_password: z.string().min(1, '请再次输入新密码'),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: '两次输入的新密码不一致',
    path: ['confirm_password'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AdminSystem() {
  const { showMessage } = useAdminMessage();
  const { user } = useAuth();

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: user?.email ?? '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  async function onSubmitEmail(values: EmailFormValues) {
    const body: ChangeEmailRequest = { email: values.email.trim() };
    try {
      await apiClient.put('/api/auth/email', body);
      showMessage('success', '邮箱已更新');
    } catch (error) {
      showMessage('error', getApiErrorDetail(error, '修改邮箱失败'));
    }
  }

  async function onSubmitPassword(values: PasswordFormValues) {
    const body: ChangePasswordRequest = {
      old_password: values.old_password,
      new_password: values.new_password,
      confirm_password: values.confirm_password,
    };
    try {
      await apiClient.put('/api/auth/password', body);
      showMessage('success', '密码修改成功，下次登录请使用新密码');
      passwordForm.reset();
    } catch (error) {
      showMessage('error', getApiErrorDetail(error, '修改密码失败'));
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-2xl tracking-[0.02em] text-text-primary">
          系统管理
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          管理账户邮箱与登录密码
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 邮箱修改 */}
        <Card className="gap-5 py-6">
          <CardHeader className="px-6 py-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4 text-primary" />
              邮箱修改
            </CardTitle>
            <CardDescription className="text-sm">
              修改后用于接收通知与找回密码
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={emailForm.handleSubmit(onSubmitEmail)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="account-email">邮箱地址</Label>
                <Input
                  id="account-email"
                  type="email"
                  placeholder="you@example.com"
                  aria-invalid={emailForm.formState.errors.email !== undefined}
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-xs text-danger">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={emailForm.formState.isSubmitting}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {emailForm.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                保存邮箱
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 密码修改 */}
        <Card className="gap-5 py-6">
          <CardHeader className="px-6 py-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-primary" />
              密码修改
            </CardTitle>
            <CardDescription className="text-sm">
              需要验证当前密码，新密码至少 6 位
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="old-password">当前密码</Label>
                <Input
                  id="old-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={
                    passwordForm.formState.errors.old_password !== undefined
                  }
                  {...passwordForm.register('old_password')}
                />
                {passwordForm.formState.errors.old_password && (
                  <p className="text-xs text-danger">
                    {passwordForm.formState.errors.old_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={
                    passwordForm.formState.errors.new_password !== undefined
                  }
                  {...passwordForm.register('new_password')}
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-xs text-danger">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={
                    passwordForm.formState.errors.confirm_password !== undefined
                  }
                  {...passwordForm.register('confirm_password')}
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-xs text-danger">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {passwordForm.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                保存密码
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
