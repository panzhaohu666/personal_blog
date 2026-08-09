import { AxiosError } from 'axios';
import type { ApiError } from '@/types';

/**
 * 从任意错误对象中提取可读的 API 错误信息
 *
 * 优先返回后端 detail 字段（如“用户名或密码错误”），
 * 兜底返回默认提示语。
 */
export function getApiErrorDetail(
  error: unknown,
  fallback = '操作失败，请稍后重试'
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | undefined;
    if (typeof data?.detail === 'string' && data.detail.length > 0) {
      return data.detail;
    }
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}
