/**
 * 文章相关数据获取 hooks
 *
 * 使用 TanStack Query (React Query v5) 管理服务端状态：
 * - 自动缓存、后台刷新、乐观更新
 * - queryKey 结构: ['posts', { page, size, category, tag, search }]
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type {
  PostDetail,
  PostListResponse,
  PostFormData,
  UploadResponse,
} from '@/types';

// ======================== 查询 hooks ========================

/** 文章列表查询参数 */
interface PostListParams {
  page?: number;
  size?: number;
  category?: string; // category slug
  tag?: string; // tag slug
  search?: string;
  status?: 'draft' | 'published' | ''; // admin 可用
}

/**
 * 获取公开文章列表（仅已发布）
 */
export function usePosts(params: PostListParams = {}) {
  return useQuery<PostListResponse>({
    queryKey: ['posts', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PostListResponse>('/api/posts', {
        params: { ...params, status: undefined },
      });
      return data;
    },
    placeholderData: (prev) => prev, // 翻页时保留旧数据防止闪烁
  });
}

/**
 * 获取管理后台文章列表（含草稿）
 * 需要登录，由 apiClient 拦截器自动附带 token
 */
export function useAdminPosts(params: PostListParams = {}) {
  return useQuery<PostListResponse>({
    queryKey: ['admin-posts', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PostListResponse>(
        '/api/admin/posts',
        { params }
      );
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

/**
 * 获取管理后台单篇文章详情（含草稿，用于编辑回填）
 * 需要登录，由 apiClient 拦截器自动附带 token
 */
export function useAdminPost(postId: string | undefined) {
  return useQuery<PostDetail>({
    queryKey: ['admin-post', postId],
    queryFn: async () => {
      if (postId === undefined) {
        throw new Error('缺少文章 ID');
      }
      const { data } = await apiClient.get<PostDetail>(
        `/api/admin/posts/${encodeURIComponent(postId)}`
      );
      return data;
    },
    enabled: !!postId, // postId 为空（创建模式）时不查询
  });
}

/**
 * 获取单篇文章详情（通过 slug）
 * 访问即记录阅读量（后端自动递增 Redis 计数器）
 */
export function usePost(slug: string) {
  return useQuery<PostDetail>({
    queryKey: ['post', slug],
    queryFn: async () => {
      const { data } = await apiClient.get<PostDetail>(
        `/api/posts/${encodeURIComponent(slug)}`
      );
      return data;
    },
    enabled: !!slug, // slug 为空时不查询
  });
}

// ======================== 变更 hooks (mutations) ========================

/** 创建文章（管理员） */
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation<PostDetail, Error, PostFormData>({
    mutationFn: async (formData: PostFormData) => {
      const { data } = await apiClient.post<PostDetail>(
        '/api/admin/posts',
        formData
      );
      return data;
    },
    onSuccess: () => {
      // 创建成功 → 刷新文章列表缓存
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/** 更新文章（管理员） */
export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation<
    PostDetail,
    Error,
    { id: string; data: PostFormData }
  >({
    mutationFn: async ({ id, data: formData }) => {
      const { data } = await apiClient.put<PostDetail>(
        `/api/admin/posts/${id}`,
        formData
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.id] });
    },
  });
}

/** 删除文章（管理员） */
export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/admin/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/** 上传图片（管理员） */
export function useUploadImage() {
  return useMutation<UploadResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<UploadResponse>(
        '/api/admin/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    },
  });
}
