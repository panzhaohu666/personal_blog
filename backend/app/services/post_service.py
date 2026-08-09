"""
文章业务逻辑服务层

封装文章的 CRUD 操作、分页查询、过滤搜索与 Redis 阅读计数。
"""

from __future__ import annotations

import math
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.redis import get_redis
from app.models import make_slug
from app.models.category import Category
from app.models.post import Post, PostStatus, post_tags
from app.models.tag import Tag
from app.schemas.post import (
    CategoryResponse,
    PostCreate,
    PostDetail,
    PostListResponse,
    PostSummary,
    PostUpdate,
    TagResponse,
)


def _post_to_summary(post: Post, view_count: int = 0) -> PostSummary:
    """将 ORM Post 对象转为 PostSummary 响应模型。"""
    category_resp = (
        CategoryResponse(
            id=str(post.category.id),
            name=post.category.name,
            slug=post.category.slug,
        )
        if post.category
        else None
    )
    tags_resp = [
        TagResponse(
            id=str(tag.id),
            name=tag.name,
            slug=tag.slug,
        )
        for tag in post.tags
    ]
    return PostSummary(
        id=str(post.id),
        title=post.title,
        slug=post.slug,
        category=category_resp,
        tags=tags_resp,
        excerpt=post.excerpt or "",
        image_url=post.image_url,
        status=post.status,
        created_at=post.created_at,  # type: ignore[arg-type]
        updated_at=post.updated_at,  # type: ignore[arg-type]
        view_count=view_count,
    )


class PostService:
    """文章业务服务（无状态，方法均为静态/类方法）。"""

    # ── Redis view-count helpers ────────────────────────────────

    @staticmethod
    def _view_key(post_id: uuid.UUID) -> str:
        return f"post:{post_id}:views"

    @staticmethod
    async def _get_view_counts(
        post_ids: list[uuid.UUID],
    ) -> dict[uuid.UUID, int]:
        """批量获取多个文章的 Redis 阅读数。"""
        if not post_ids:
            return {}
        redis = await get_redis()
        keys = [f"post:{pid}:views" for pid in post_ids]
        values = await redis.mget(keys)
        return {
            pid: int(v) if v else 0
            for pid, v in zip(post_ids, values)
        }

    # ── 公开接口 ────────────────────────────────────────────────

    @staticmethod
    async def get_posts(
        db: AsyncSession,
        *,
        page: int = 1,
        size: int = 10,
        category: str | None = None,
        tag: str | None = None,
        search: str | None = None,
        status: str | None = "published",
    ) -> PostListResponse:
        """获取文章分页列表，支持按分类、标签、搜索过滤。"""
        page = max(page, 1)
        size = max(size, 1)
        size = min(size, 100)

        # 构造基础查询
        stmt = select(Post)

        # 状态过滤
        if status is not None:
            stmt = stmt.where(Post.status == status)

        # 分类过滤（按 slug）
        if category:
            stmt = stmt.join(Post.category).where(Category.slug == category)

        # 标签过滤（按 slug）
        if tag:
            stmt = stmt.join(Post.tags).where(Tag.slug == tag)

        # 搜索（ILIKE 模糊匹配）
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    Post.title.ilike(pattern),
                    Post.body.ilike(pattern),
                )
            )

        # 加载关联
        stmt = stmt.options(
            selectinload(Post.category),
            selectinload(Post.tags),
        )

        # 总数查询
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar_one()

        # 分页
        offset = (page - 1) * size
        stmt = stmt.order_by(Post.created_at.desc()).offset(offset).limit(size)
        result = await db.execute(stmt)
        posts: list[Post] = list(result.scalars().unique().all())

        # 批量获取 Redis 阅读数
        post_ids = [p.id for p in posts]
        view_counts = await PostService._get_view_counts(post_ids)

        items = [
            _post_to_summary(p, view_count=view_counts.get(p.id, 0))
            for p in posts
        ]
        pages = max(math.ceil(total / size), 1)

        return PostListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages,
        )

    @staticmethod
    async def get_post_by_slug(
        db: AsyncSession,
        slug: str,
        *,
        require_published: bool = True,
    ) -> PostDetail:
        """根据 slug 获取文章详情，同时原子递增 Redis 阅读数。"""
        stmt = select(Post).where(Post.slug == slug).options(
            selectinload(Post.category),
            selectinload(Post.tags),
        )
        if require_published:
            stmt = stmt.where(Post.status == PostStatus.PUBLISHED)

        result = await db.execute(stmt)
        post = result.scalar_one_or_none()
        if post is None:
            raise FileNotFoundError(f"文章不存在: {slug}")

        # 原子递增 Redis view counter
        redis = await get_redis()
        key = PostService._view_key(post.id)
        new_views: int = await redis.incr(key)

        summary = _post_to_summary(post, view_count=new_views)
        return PostDetail(
            id=summary.id,
            title=summary.title,
            slug=summary.slug,
            category=summary.category,
            tags=summary.tags,
            excerpt=summary.excerpt,
            image_url=summary.image_url,
            status=summary.status,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
            view_count=summary.view_count,
            body=post.body,
        )

    # ── 管理接口 ────────────────────────────────────────────────

    @staticmethod
    async def get_admin_post_by_id(
        db: AsyncSession,
        post_id: uuid.UUID,
    ) -> PostDetail:
        """管理后台按 ID 获取文章详情（含草稿，不递增阅读数）。"""
        stmt = (
            select(Post)
            .where(Post.id == post_id)
            .options(selectinload(Post.category), selectinload(Post.tags))
        )
        result = await db.execute(stmt)
        post = result.scalar_one_or_none()
        if post is None:
            raise FileNotFoundError(f"文章不存在: {post_id}")

        # 读取当前阅读数（不递增）
        redis = await get_redis()
        key = PostService._view_key(post.id)
        vc_raw = await redis.get(key)
        view_count = int(vc_raw) if vc_raw else 0

        summary = _post_to_summary(post, view_count=view_count)
        return PostDetail(
            id=summary.id,
            title=summary.title,
            slug=summary.slug,
            category=summary.category,
            tags=summary.tags,
            excerpt=summary.excerpt,
            image_url=summary.image_url,
            status=summary.status,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
            view_count=summary.view_count,
            body=post.body,
        )

    @staticmethod
    async def create_post(
        db: AsyncSession,
        data: PostCreate,
    ) -> PostDetail:
        """创建新文章。若 slug 未提供则自动生成。"""
        slug = data.slug.strip() if data.slug else ""
        if not slug:
            slug = make_slug(data.title)

        category_id: int | None = None
        if data.category_id:
            try:
                category_id = int(data.category_id)
            except (ValueError, TypeError):
                category_id = None

        tag_ids: list[int] = []
        for tid in data.tag_ids:
            try:
                tag_ids.append(int(tid))
            except (ValueError, TypeError):
                pass

        post = Post(
            title=data.title,
            slug=slug,
            category_id=category_id,
            excerpt=data.excerpt or "",
            body=data.body,
            image_url=data.image_url,
            status=PostStatus(data.status),
        )

        if tag_ids:
            result = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
            post.tags = list(result.scalars().all())

        db.add(post)
        await db.flush()
        await db.refresh(post, attribute_names=["category", "tags"])

        summary = _post_to_summary(post, view_count=0)
        return PostDetail(
            id=summary.id,
            title=summary.title,
            slug=summary.slug,
            category=summary.category,
            tags=summary.tags,
            excerpt=summary.excerpt,
            image_url=summary.image_url,
            status=summary.status,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
            view_count=summary.view_count,
            body=post.body,
        )

    @staticmethod
    async def update_post(
        db: AsyncSession,
        post_id: uuid.UUID,
        data: PostUpdate,
    ) -> PostDetail:
        """更新文章。"""
        stmt = (
            select(Post)
            .where(Post.id == post_id)
            .options(selectinload(Post.category), selectinload(Post.tags))
        )
        result = await db.execute(stmt)
        post = result.scalar_one_or_none()
        if post is None:
            raise FileNotFoundError(f"文章不存在: {post_id}")

        # 更新字段
        post.title = data.title
        if data.slug and data.slug.strip():
            post.slug = data.slug.strip()
        post.excerpt = data.excerpt or ""
        post.body = data.body
        post.image_url = data.image_url
        post.status = PostStatus(data.status)

        # category_id
        if data.category_id:
            try:
                post.category_id = int(data.category_id)
            except (ValueError, TypeError):
                post.category_id = None
        else:
            post.category_id = None

        # tags 关联更新
        tag_ids: list[int] = []
        for tid in data.tag_ids:
            try:
                tag_ids.append(int(tid))
            except (ValueError, TypeError):
                pass

        if tag_ids:
            result = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
            post.tags = list(result.scalars().all())
        else:
            post.tags = []

        # 在 flush 前构造响应（flush 后 ORM 属性过期会触发 MissingGreenlet）
        redis = await get_redis()
        key = PostService._view_key(post.id)
        vc_raw = await redis.get(key)
        view_count = int(vc_raw) if vc_raw else 0
        summary = _post_to_summary(post, view_count=view_count)

        await db.flush()

        return PostDetail(
            id=summary.id,
            title=summary.title,
            slug=summary.slug,
            category=summary.category,
            tags=summary.tags,
            excerpt=summary.excerpt,
            image_url=summary.image_url,
            status=summary.status,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
            view_count=summary.view_count,
            body=post.body,
        )

    @staticmethod
    async def delete_post(
        db: AsyncSession,
        post_id: uuid.UUID,
    ) -> None:
        """删除文章。"""
        stmt = select(Post).where(Post.id == post_id)
        result = await db.execute(stmt)
        post = result.scalar_one_or_none()
        if post is None:
            raise FileNotFoundError(f"文章不存在: {post_id}")
        await db.delete(post)
        await db.flush()

        # 清理 Redis 阅读数缓存
        redis = await get_redis()
        await redis.delete(PostService._view_key(post_id))

    @staticmethod
    async def get_admin_posts(
        db: AsyncSession,
        *,
        page: int = 1,
        size: int = 10,
        search: str | None = None,
    ) -> PostListResponse:
        """管理后台获取全部文章列表（包含草稿）。"""
        return await PostService.get_posts(
            db,
            page=page,
            size=size,
            search=search,
            status=None,  # 不过滤状态 → 返回全部
        )
