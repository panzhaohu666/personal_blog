"""
ILIKE 搜索引擎

使用 PostgreSQL ILIKE 操作符在 title 和 body 字段上进行模糊匹配。
"""

from __future__ import annotations

import time
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.post import Post
from app.search.base import SearchEngine
from app.services.post_service import _post_to_summary


class ILIKESearchEngine(SearchEngine):
    """基于 PostgreSQL ILIKE 的搜索引擎。

    优点：无需额外索引，实现简单。
    缺点：大数据量下性能较差，不支持中文分词和相关性排序。
    """

    name = "ilike"

    async def search(
        self,
        db: AsyncSession,
        *,
        query: str,
        page: int = 1,
        size: int = 10,
    ) -> dict[str, Any]:
        """执行 ILIKE 模糊搜索。"""
        page = max(page, 1)
        size = max(min(size, 100), 1)

        pattern = f"%{query}%"

        start = time.perf_counter()

        # 构造查询
        stmt = (
            select(Post)
            .where(
                or_(
                    Post.title.ilike(pattern),
                    Post.body.ilike(pattern),
                )
            )
            .options(
                selectinload(Post.category),
                selectinload(Post.tags),
            )
        )

        # 总数
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar_one()

        # 分页获取
        offset = (page - 1) * size
        stmt = stmt.order_by(Post.created_at.desc()).offset(offset).limit(size)
        result = await db.execute(stmt)
        posts: list[Post] = list(result.scalars().unique().all())

        elapsed = (time.perf_counter() - start) * 1000

        items = [_post_to_summary(p) for p in posts]

        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "took_ms": round(elapsed, 2),
        }
