import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 CSS 类名工具函数
 * 使用 clsx 处理条件类名，使用 tailwind-merge 智能合并冲突的 Tailwind 类名
 *
 * @param inputs - 任意数量的类名参数（支持条件、数组等）
 * @returns 合并后的规范化类名字符串
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary text-white')
 * // → 'px-4 py-2 bg-primary text-white'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
