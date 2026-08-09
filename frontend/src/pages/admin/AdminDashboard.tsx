/**
 * 管理后台工作台（需登录）
 * URL: /admin
 *
 * 顶部展示当前用户（头像 + 用户名），
 * 中部 4 张统计卡片（总文章/已发布/总访问/分类标签），
 * 底部 4 个快捷操作入口。
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  FolderOpen,
  Settings,
  SquarePen,
  Tags,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStatsOverview } from '@/hooks/useSearch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCard {
  label: string;
  value: number | string;
  icon: typeof FileText;
  iconClassName: string;
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: typeof SquarePen;
  iconClassName: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: '写文章',
    description: '创建一篇新文章',
    href: '/admin/posts/new',
    icon: SquarePen,
    iconClassName: 'bg-primary-100 text-primary-700',
  },
  {
    title: '管理文章',
    description: '编辑、删除已有文章',
    href: '/admin/posts',
    icon: FolderOpen,
    iconClassName: 'bg-warning-bg text-warning-text',
  },
  {
    title: '分类标签',
    description: '维护分类与标签',
    href: '/admin/categories',
    icon: Tags,
    iconClassName: 'bg-success-bg text-success-text',
  },
  {
    title: '系统管理',
    description: '修改邮箱与密码',
    href: '/admin/system',
    icon: Settings,
    iconClassName: 'bg-error-bg text-danger',
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useStatsOverview();

  const statCards: StatCard[] = [
    {
      label: '总文章',
      value: stats?.total_posts ?? 0,
      icon: FileText,
      iconClassName: 'bg-primary-100 text-primary-700',
    },
    {
      label: '已发布',
      value: stats?.published_posts ?? 0,
      icon: CheckCircle2,
      iconClassName: 'bg-success-bg text-success-text',
    },
    {
      label: '总访问',
      value: stats?.total_views ?? 0,
      icon: Eye,
      iconClassName: 'bg-warning-bg text-warning-text',
    },
    {
      label: '分类标签',
      value: (stats?.total_categories ?? 0) + (stats?.total_tags ?? 0),
      icon: Tags,
      iconClassName: 'bg-error-bg text-danger',
    },
  ];

  return (
    <div>
      {/* 页面头部：标题 + 用户信息 */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl tracking-[0.02em] text-text-primary">
            工作台
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            欢迎回来，这里是你的博客管理概览
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface px-4 py-2 shadow-sm">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary-200 text-primary-800">
              {(user?.username ?? 'A').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-text-primary">
              {user?.username}
            </p>
            <p className="text-xs text-text-muted">管理员</p>
          </div>
        </div>
      </header>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="gap-0 py-5">
              <CardContent className="flex items-center gap-4 px-5">
                <div
                  className={cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-xl',
                    card.iconClassName
                  )}
                >
                  <Icon className="size-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-text-muted">{card.label}</p>
                  {isLoading ? (
                    <div className="mt-1 h-8 w-16 animate-pulse rounded-md bg-primary-100" />
                  ) : (
                    <p className="text-2xl font-bold text-text-primary">
                      {card.value}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 快捷操作 */}
      <h2 className="mt-10 mb-4 text-base font-semibold text-text-soft">
        快捷操作
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              to={action.href}
              className="group rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    'flex size-11 items-center justify-center rounded-lg',
                    action.iconClassName
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <ArrowRight className="size-4 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <p className="mt-4 font-semibold text-text-primary">
                {action.title}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {action.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
