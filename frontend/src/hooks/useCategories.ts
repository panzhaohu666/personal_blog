/**
 * 分类 & 标签数据获取 hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { Category, Tag } from '@/types';

// ======================== 分类 ========================

/** 获取分类列表 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<Category[]>('/api/categories');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
  });
}

/** 创建分类（管理员） */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, { name: string }>({
    mutationFn: async ({ name }) => {
      const { data } = await apiClient.post<Category>(
        '/api/admin/categories',
        { name }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

/** 删除分类（管理员） */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/admin/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ======================== 标签 ========================

/** 获取标签列表 */
export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await apiClient.get<Tag[]>('/api/tags');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** 创建标签（管理员） */
export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation<Tag, Error, { name: string }>({
    mutationFn: async ({ name }) => {
      const { data } = await apiClient.post<Tag>('/api/admin/tags', { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

/** 删除标签（管理员） */
export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/admin/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
