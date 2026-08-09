"""
全文搜索引擎抽象接口

所有搜索引擎（ILIKE、tsvector、Elasticsearch）均需实现此接口。
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


class SearchEngine(ABC):
    """全文搜索引擎抽象基类。

    子类必须实现 search() 方法，返回统一格式的 dict:
        {
            "items": list[PostSummary],
            "total": int,
            "page": int,
            "size": int,
            "took_ms": float,
        }
    """

    @abstractmethod
    async def search(
        self,
        db: AsyncSession,
        *,
        query: str,
        page: int = 1,
        size: int = 10,
    ) -> dict[str, Any]:
        """执行全文搜索。

        Args:
            db: 异步数据库会话。
            query: 搜索关键词。
            page: 页码（从 1 开始）。
            size: 每页数量。

        Returns:
            包含 items、total、page、size、took_ms 的字典。
        """
        ...
