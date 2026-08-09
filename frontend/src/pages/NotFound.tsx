import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F2E9] px-4 text-center">
      <h1 className="font-serif text-8xl font-bold text-[#E9DFCE]">404</h1>
      <p className="mt-4 text-lg text-[#5F5649]">页面不存在</p>
      <Link to="/blog" className="mt-6 rounded-lg bg-[#B9812F] px-6 py-2.5 text-sm text-white hover:bg-[#8F5E1D]">返回首页</Link>
    </div>
  );
}
