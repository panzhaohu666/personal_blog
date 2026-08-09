import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiError } from '@/types';

/**
 * API 客户端模块
 *
 * 基于 axios 封装，提供：
 * - 自动从环境变量读取 API 基础 URL
 * - JWT token 自动附加到请求头
 * - 401 响应自动重定向到登录页
 * - 统一的错误格式处理
 */

/** 后端 API 基础 URL，FastAPI 直接提供 /api/* 路由 */
const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || '';

/**
 * 从 localStorage 读取 JWT access token
 */
function getAccessToken(): string {
  return localStorage.getItem('access_token') ?? '';
}

/**
 * 从 localStorage 读取 JWT refresh token
 */
function getRefreshToken(): string {
  return localStorage.getItem('refresh_token') ?? '';
}

/** 创建 axios 实例 */
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * 请求拦截器 —— 自动附加 JWT Bearer token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

/**
 * 响应拦截器 —— 401 未授权处理
 *
 * 当服务器返回 401：
 * 1. 清除本地 token
 * 2. 重定向到 /login（携带当前路径以便登录后跳回）
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
    return Promise.reject(error);
  }
);

export { getAccessToken, getRefreshToken };
export default apiClient;
