import { Link } from 'react-router-dom';
import { useStatsOverview } from '@/hooks/useSearch';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useStatsOverview();

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-[#2B2620] dark:text-gray-100">工作台</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-[#FFFDF8] dark:bg-gray-800" />)
        ) : (
          <>
            <div className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-5"><p className="text-xs text-[#8E8375]">总文章</p><p className="mt-1 text-2xl font-bold text-[#2B2620] dark:text-gray-100">{stats?.total_posts ?? 0}</p></div>
            <div className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-5"><p className="text-xs text-[#8E8375]">已发布</p><p className="mt-1 text-2xl font-bold text-green-700">{stats?.published_posts ?? 0}</p></div>
            <div className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-5"><p className="text-xs text-[#8E8375]">总访问</p><p className="mt-1 text-2xl font-bold text-[#B9812F]">{stats?.total_views ?? 0}</p></div>
            <div className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-5"><p className="text-xs text-[#8E8375]">分类/标签</p><p className="mt-1 text-2xl font-bold text-[#2B2620] dark:text-gray-100">{(stats?.total_categories ?? 0) + (stats?.total_tags ?? 0)}</p></div>
          </>
        )}
      </div>
      <h2 className="mb-4 font-serif text-lg font-bold text-[#2B2620] dark:text-gray-100">快捷操作</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link to="/admin/posts/new" className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-2xl">✏️</div>
          <p className="text-sm font-medium text-[#2B2620] dark:text-gray-100">写文章</p>
        </Link>
        <Link to="/admin/posts" className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">📄</div>
          <p className="text-sm font-medium text-[#2B2620] dark:text-gray-100">文章管理</p>
        </Link>
        <Link to="/admin/categories" className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">📁</div>
          <p className="text-sm font-medium text-[#2B2620] dark:text-gray-100">分类标签</p>
        </Link>
        <Link to="/admin/system" className="rounded-xl border border-[#E9DFCE] dark:border-gray-700 bg-[#FFFDF8] dark:bg-gray-800 p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-2xl">⚙️</div>
          <p className="text-sm font-medium text-[#2B2620] dark:text-gray-100">系统设置</p>
        </Link>
      </div>
    </div>
  );
}
