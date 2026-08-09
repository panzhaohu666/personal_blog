-- PostgreSQL 初始化脚本
-- 在容器首次启动时自动执行

-- 启用 pg_trgm 扩展（用于 ILIKE 搜索优化和模糊匹配）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 启用 zhparser 中文分词（如果可用）
-- CREATE EXTENSION IF NOT EXISTS zhparser;
-- 注意：zhparser 需要单独编译安装，本地开发可跳过
-- 生产环境建议安装以便完整使用 tsvector 中文搜索
