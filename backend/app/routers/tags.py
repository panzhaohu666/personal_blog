"""
文章标签路由

提供公开的标签列表查询以及管理端的标签创建/删除。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.post import Post, PostStatus, post_tags
from app.models.tag import Tag
from app.schemas.post import TagCreate, TagResponse

router = APIRouter()


@router.get(
    "/api/tags",
    response_model=list[TagResponse],
    tags=["标签"],
)
async def list_tags(
    db: AsyncSession = Depends(get_db),
) -> list[TagResponse]:
    """获取所有标签及其已发布文章数量。"""
    # 查询每个标签关联的已发布文章数
    count_subq = (
        select(
            post_tags.c.tag_id,
            func.count(post_tags.c.post_id).label("cnt"),
        )
        .select_from(post_tags.join(Post, post_tags.c.post_id == Post.id))
        .where(Post.status == PostStatus.PUBLISHED)
        .group_by(post_tags.c.tag_id)
        .subquery()
    )

    stmt = (
        select(Tag, func.coalesce(count_subq.c.cnt, 0).label("post_count"))
        .outerjoin(count_subq, Tag.id == count_subq.c.tag_id)
        .order_by(Tag.name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        TagResponse(
            id=str(tag.id),
            name=tag.name,
            slug=tag.slug,
            post_count=int(post_count),
        )
        for tag, post_count in rows
    ]


@router.post(
    "/api/admin/tags",
    response_model=TagResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["管理-标签"],
)
async def create_tag(
    body: TagCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> TagResponse:
    """创建新标签（需要认证）。slug 由 name 自动生成。"""
    existing = await db.execute(select(Tag).where(Tag.name == body.name.strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"标签 '{body.name}' 已存在",
        )

    tag = Tag(name=body.name.strip())
    db.add(tag)
    await db.flush()
    await db.refresh(tag)

    return TagResponse(
        id=str(tag.id),
        name=tag.name,
        slug=tag.slug,
        post_count=0,
    )


@router.delete(
    "/api/admin/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["管理-标签"],
)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> None:
    """删除标签（需要认证）。关联文章自动解除标签关系（CASCADE）。"""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="标签不存在",
        )
    await db.delete(tag)
