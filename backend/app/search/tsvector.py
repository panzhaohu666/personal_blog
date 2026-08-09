"""
PostgreSQL tsvector 全文搜索引擎

使用 PostgreSQL 内置的全文搜索功能：
- to_tsvector('simple', ...) 构建文本向量（使用 simple 字典支持中文）
- plainto_tsquery('simple', ...) 将用户输入转为查询向量
- search_vector @@ query 进行匹配
- GIN 索引加速查询
- 触发器自动更新 search_vector 列
"""

from __future__ import annotations

import time
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.post import Post
from app.search.base import SearchEngine
from app.services.post_service import _post_to_summary


class TSVectorSearchEngine(SearchEngine):
    """基于 PostgreSQL tsvector 的搜索引擎。

    优点：利用数据库全文索引，支持中文（simple 字典），查询速度快，可相关性排序。
    缺点：需额外迁移添加 search_vector 列和 GIN 索引，分词精度不如专用搜索引擎。
    """

    name = "tsvector"

    async def search(
        self,
        db: AsyncSession,
        *,
        query: str,
        page: int = 1,
        size: int = 10,
    ) -> dict[str, Any]:
        """使用 tsvector 全文搜索。

        通过 search_vector @@ plainto_tsquery('simple', query) 进行匹配，
        按相关性（ts_rank）降序排列。
        """
        page = max(page, 1)
        size = max(min(size, 100), 1)

        start = time.perf_counter()

        # ts_rank: 按匹配相关性排序
        rank = func.ts_rank(
            Post.search_vector,
            func.plainto_tsquery(text("'simple'"), query),
        )

        stmt = (
            select(Post)
            .where(
                Post.search_vector.op("@@")(
                    func.plainto_tsquery(text("'simple'"), query)
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

        # 分页获取（按相关性排序）
        offset = (page - 1) * size
        stmt = stmt.order_by(rank.desc()).offset(offset).limit(size)
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
