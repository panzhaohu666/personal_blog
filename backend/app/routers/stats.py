"""
访问统计路由

提供站点总览统计和单篇文章的访问量查询。
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.models.category import Category
from app.models.post import Post, PostStatus
from app.models.tag import Tag
from app.models.visit import VisitLog
from app.schemas.stats import PostStats, StatsOverview

router = APIRouter()


@router.get(
    "/api/stats/overview",
    response_model=StatsOverview,
    tags=["统计"],
)
async def stats_overview(
    db: AsyncSession = Depends(get_db),
) -> StatsOverview:
    """获取站点总览统计。

    - total_posts: 文章总数
    - published_posts: 已发布文章数
    - total_views: 所有文章总访问量（来自 Redis）
    - total_categories: 分类总数
    - total_tags: 标签总数
    """
    # 文章统计
    total_posts_result = await db.execute(select(func.count(Post.id)))
    total_posts = total_posts_result.scalar_one()

    published_result = await db.execute(
        select(func.count(Post.id)).where(Post.status == PostStatus.PUBLISHED)
    )
    published_posts = published_result.scalar_one()

    # 分类/标签计数
    categories_result = await db.execute(select(func.count(Category.id)))
    total_categories = categories_result.scalar_one()

    tags_result = await db.execute(select(func.count(Tag.id)))
    total_tags = tags_result.scalar_one()

    # Redis 总访问量：扫描所有 post:*:views 键并求和
    redis = await get_redis()
    total_views = 0
    cursor = 0
    while True:
        cursor, keys = await redis.scan(cursor, match="post:*:views", count=100)
        for key in keys:
            val = await redis.get(key)
            if val is not None:
                try:
                    total_views += int(val)
                except (ValueError, TypeError):
                    pass
        if cursor == 0:
            break

    return StatsOverview(
        total_posts=total_posts,
        published_posts=published_posts,
        total_views=total_views,
        total_categories=total_categories,
        total_tags=total_tags,
    )


@router.get(
    "/api/stats/posts/{post_id}",
    response_model=PostStats,
    tags=["统计"],
)
async def post_stats(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PostStats:
    """获取单篇文章的访问统计。

    - view_count: 文章总访问量（Redis 计数器）
    - today_views: 今日访问量（visit_logs 表）
    """
    # 查询文章信息
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文章不存在",
        )

    # Redis 总访问量
    redis = await get_redis()
    redis_key = f"post:{post_id}:views"
    raw = await redis.get(redis_key)
    view_count = int(raw) if raw else 0

    # 今日访问量（visit_logs 表）
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    today_result = await db.execute(
        select(func.count(VisitLog.id)).where(
            VisitLog.post_id == post_id,
            VisitLog.visited_at >= today_start,
        )
    )
    today_views = today_result.scalar_one()

    return PostStats(
        post_id=str(post.id),
        post_title=post.title,
        view_count=view_count,
        today_views=today_views,
    )
