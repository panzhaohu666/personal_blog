/**
 * 前端类型定义
 * 与 FastAPI 后端 Pydantic schemas 一一对应
 * 所有字段均为必需或显式可选（使用 ? 标记），禁止使用 any 类型
 */

// ======================== 核心数据模型 ========================

/** 用户信息 */
export interface User {
  id: string; // UUID
  username: string;
  email: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601
}

/** 文章分类 */
export interface Category {
  id: string; // UUID (int)
  name: string;
  slug: string;
  post_count: number;
}

/** 文章标签 */
export interface Tag {
  id: string; // UUID (int)
  name: string;
  slug: string;
  post_count: number;
}

/** 博客文章摘要（列表用，不含正文） */
export interface PostSummary {
  id: string; // UUID
  title: string;
  slug: string;
  category: Category | null;
  tags: Tag[];
  excerpt: string;
  image_url: string | null;
  status: 'draft' | 'published';
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  view_count: number;
}

/** 博客文章详情（含正文 Markdown） */
export interface PostDetail extends PostSummary {
  body: string; // Markdown 正文
}

// ======================== 分页/列表响应 ========================

/** 文章列表分页响应 */
export interface PostListResponse {
  items: PostSummary[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/** 搜索结果响应 */
export interface SearchResult {
  query: string;
  engine: 'ilike' | 'tsvector' | 'elasticsearch';
  took_ms: number;
  items: PostSummary[];
  total: number;
  page: number;
  size: number;
}

// ======================== 认证相关 ========================

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** JWT Token 响应 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/** 修改密码请求 */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

/** 修改邮箱请求 */
export interface ChangeEmailRequest {
  email: string;
}

// ======================== 文章操作 ========================

/** 创建/更新文章请求 */
export interface PostFormData {
  title: string;
  slug?: string;
  category_id?: string;
  tag_ids?: string[];
  excerpt?: string;
  body: string;
  status: 'draft' | 'published';
  image_url?: string;
}

/** 图片上传响应 */
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
}

// ======================== 统计 ========================

/** 站点总览统计 */
export interface StatsOverview {
  total_posts: number;
  published_posts: number;
  total_views: number;
  total_categories: number;
  total_tags: number;
}

/** 单篇文章访问统计 */
export interface PostStats {
  post_id: string;
  post_title: string;
  view_count: number;
  today_views: number;
}

// ======================== API 错误 ========================

/** 统一的 API 错误格式 */
export interface ApiError {
  detail: string;
  status_code?: number;
}
