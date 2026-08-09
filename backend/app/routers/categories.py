"""
文章分类路由

提供公开的分类列表查询以及管理端的分类创建/删除。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.category import Category
from app.models.post import Post, PostStatus
from app.schemas.post import CategoryCreate, CategoryResponse

router = APIRouter()


@router.get(
    "/api/categories",
    response_model=list[CategoryResponse],
    tags=["分类"],
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
) -> list[CategoryResponse]:
    """获取所有分类及其已发布文章数量。"""
    # 查询每个分类的已发布文章数
    count_subq = (
        select(
            Post.category_id,
            func.count(Post.id).label("cnt"),
        )
        .where(Post.status == PostStatus.PUBLISHED)
        .group_by(Post.category_id)
        .subquery()
    )

    stmt = (
        select(Category, func.coalesce(count_subq.c.cnt, 0).label("post_count"))
        .outerjoin(count_subq, Category.id == count_subq.c.category_id)
        .order_by(Category.name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        CategoryResponse(
            id=str(cat.id),
            name=cat.name,
            slug=cat.slug,
            post_count=int(post_count),
        )
        for cat, post_count in rows
    ]


@router.post(
    "/api/admin/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["管理-分类"],
)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> CategoryResponse:
    """创建新分类（需要认证）。slug 由 name 自动生成。"""
    # 检查名称是否已存在
    existing = await db.execute(select(Category).where(Category.name == body.name.strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"分类 '{body.name}' 已存在",
        )

    category = Category(name=body.name.strip())
    db.add(category)
    await db.flush()
    await db.refresh(category)

    return CategoryResponse(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
        post_count=0,
    )


@router.delete(
    "/api/admin/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["管理-分类"],
)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> None:
    """删除分类（需要认证）。关联文章的分类字段将被设为 NULL。"""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在",
        )
    await db.delete(category)
