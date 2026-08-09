"""
全文搜索引擎模块

提供统一的搜索接口，支持多种后端引擎：
- ilike: PostgreSQL ILIKE 模糊匹配
- tsvector: PostgreSQL tsvector 全文搜索（含中文支持）
- elasticsearch: Elasticsearch 全文搜索（待实现）

用法:
    from app.search import get_search_engine

    engine = get_search_engine("tsvector")
    result = await engine.search(db, query="关键词", page=1, size=10)
"""

from __future__ import annotations

from app.search.base import SearchEngine
from app.search.ilike import ILIKESearchEngine
from app.search.tsvector import TSVectorSearchEngine

__all__ = [
    "SearchEngine",
    "ILIKESearchEngine",
    "TSVectorSearchEngine",
    "SEARCH_ENGINES",
    "get_search_engine",
]

SEARCH_ENGINES: dict[str, type[SearchEngine]] = {
    "ilike": ILIKESearchEngine,
    "tsvector": TSVectorSearchEngine,
}


def get_search_engine(engine_name: str) -> SearchEngine:
    """根据引擎名称获取搜索引擎实例。

    Args:
        engine_name: 引擎名称，可选 "ilike"、"tsvector"。

    Returns:
        对应 SearchEngine 子类的实例。

    Raises:
        ValueError: 当 engine_name 不在 SEARCH_ENGINES 中时抛出。
    """
    engine_class = SEARCH_ENGINES.get(engine_name)
    if engine_class is None:
        available = ", ".join(SEARCH_ENGINES.keys())
        raise ValueError(
            f"Unknown search engine: {engine_name!r}. Available: {available}"
        )
    return engine_class()
