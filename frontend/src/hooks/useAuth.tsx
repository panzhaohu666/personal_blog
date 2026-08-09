import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import apiClient from '@/api/client';
import type { LoginRequest, TokenResponse, User } from '@/types';

/**
 * Auth 上下文 —— 全局 JWT 认证状态管理
 *
 * 提供：
 * - user: 当前登录用户信息（null = 未登录）
 * - isAuthenticated: 是否已登录
 * - isLoading: 是否正在检查/恢复登录状态
 * - login(): 发送登录请求，保存 JWT tokens
 * - logout(): 清除 tokens 并重定向到登录页
 *
 * JWT 流程：
 * 1. 登录 → POST /api/auth/login → 获取 access_token + refresh_token
 * 2. 后续请求自动携带 Bearer token（由 apiClient 拦截器处理）
 * 3. 401 时自动清除 token 并跳转登录页
 */

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider —— 包裹整个应用，提供全局认证状态
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * 应用启动时：检查 localStorage 中是否有 token
   * 如果有，调用 /api/auth/me 验证 token 是否仍然有效
   */
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiClient
      .get<User>('/api/auth/me')
      .then((response) => setUser(response.data))
      .catch(() => {
        // Token 无效或已过期
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * 登录：POST /api/auth/login
   * 成功后保存 token 到 localStorage
   */
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    const response = await apiClient.post<TokenResponse>(
      '/api/auth/login',
      credentials
    );
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    // 登录成功后立即获取用户信息
    const userResponse = await apiClient.get<User>('/api/auth/me');
    setUser(userResponse.data);
  }, []);

  /**
   * 登出：清除本地状态
   */
  const logout = useCallback((): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, isAuthenticated: user !== null, isLoading, login, logout }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook —— 在任何组件中获取认证状态
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}
