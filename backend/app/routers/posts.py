"""
文章 API 路由

提供公开文章接口（列表、详情）和管理后台文章接口（CRUD）。
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.post import (
    PostCreate,
    PostDetail,
    PostListResponse,
    PostUpdate,
    SearchResult,
)
from app.search import get_search_engine
from app.services.post_service import PostService

# ── 公开路由 ───────────────────────────────────────────────────

post_router = APIRouter(tags=["文章"])


@post_router.get("/api/posts", response_model=PostListResponse)
async def list_posts(
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=10, ge=1, le=100, description="每页数量"),
    category: str | None = Query(default=None, description="按分类 slug 筛选"),
    tag: str | None = Query(default=None, description="按标签 slug 筛选"),
    search: str | None = Query(default=None, description="搜索关键词（标题/正文模糊匹配）"),
    db: AsyncSession = Depends(get_db),
) -> PostListResponse:
    """公开文章列表：已发布文章，支持分类/标签/搜索过滤，分页。"""
    return await PostService.get_posts(
        db,
        page=page,
        size=size,
        category=category,
        tag=tag,
        search=search,
        status="published",
    )


@post_router.get("/api/posts/search", response_model=SearchResult)
async def search_posts(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=10, ge=1, le=100, description="每页数量"),
    engine: str = Query(default="ilike", description="搜索引擎：ilike | tsvector"),
    db: AsyncSession = Depends(get_db),
) -> SearchResult:
    """全文搜索：支持 ILIKE 和 tsvector 两种引擎，返回耗时统计。"""
    search_engine = get_search_engine(engine)
    result = await search_engine.search(db, query=q, page=page, size=size)
    return SearchResult(
        query=q,
        engine=engine,
        took_ms=result["took_ms"],
        items=result["items"],
        total=result["total"],
        page=result["page"],
        size=result["size"],
    )


@post_router.get("/api/posts/{slug}", response_model=PostDetail)
async def get_post(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> PostDetail:
    """公开文章详情：按 slug 获取已发布文章，同时递增 Redis 阅读计数。"""
    try:
        return await PostService.get_post_by_slug(db, slug, require_published=True)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")


# ── 管理后台路由 ───────────────────────────────────────────────

admin_post_router = APIRouter(
    prefix="/api/admin/posts",
    tags=["文章管理"],
    dependencies=[Depends(get_current_user)],
)


@admin_post_router.get("", response_model=PostListResponse)
async def admin_list_posts(
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=10, ge=1, le=100, description="每页数量"),
    search: str | None = Query(default=None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db),
) -> PostListResponse:
    """管理后台文章列表：返回全部文章（包含草稿）。"""
    return await PostService.get_admin_posts(
        db,
        page=page,
        size=size,
        search=search,
    )


@admin_post_router.post(
    "",
    response_model=PostDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
) -> PostDetail:
    """创建新文章。slug 留空时自动从标题生成。"""
    return await PostService.create_post(db, data)


@admin_post_router.get("/{post_id}", response_model=PostDetail)
async def admin_get_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PostDetail:
    """管理后台获取单篇文章详情（含草稿，用于编辑回填，不递增阅读数）。"""
    try:
        return await PostService.get_admin_post_by_id(db, post_id)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")


@admin_post_router.put("/{post_id}", response_model=PostDetail)
async def update_post(
    post_id: uuid.UUID,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
) -> PostDetail:
    """更新文章。"""
    try:
        return await PostService.update_post(db, post_id, data)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")


@admin_post_router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    """删除文章。"""
    try:
        await PostService.delete_post(db, post_id)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")
