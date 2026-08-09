/**
 * 搜索 & 统计 & 搜索hooks
 */
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type {
  SearchResult,
  StatsOverview,
  PostStats,
} from '@/types';

/** 搜索文章 */
export function useSearch(
  query: string,
  engine: 'ilike' | 'tsvector' | 'elasticsearch' = 'ilike',
  page = 1,
  size = 10
) {
  return useQuery<SearchResult>({
    queryKey: ['search', query, engine, page, size],
    queryFn: async () => {
      const { data } = await apiClient.get<SearchResult>('/api/posts/search', {
        params: { q: query, engine, page, size },
      });
      return data;
    },
    enabled: query.length > 0,
  });
}

/** 获取站点总览统计 */
export function useStatsOverview() {
  return useQuery<StatsOverview>({
    queryKey: ['stats', 'overview'],
    queryFn: async () => {
      const { data } = await apiClient.get<StatsOverview>(
        '/api/stats/overview'
      );
      return data;
    },
    refetchInterval: 30 * 1000, // 每 30 秒刷新一次
  });
}

/** 获取单篇文章访问统计 */
export function usePostStats(postId: string | undefined) {
  return useQuery<PostStats>({
    queryKey: ['stats', 'post', postId],
    queryFn: async () => {
      const { data } = await apiClient.get<PostStats>(
        `/api/stats/posts/${postId}`
      );
      return data;
    },
    enabled: !!postId,
  });
}
