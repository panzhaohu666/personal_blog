"""
Redis 缓存模块

提供基于 redis-py 的异步 Redis 客户端，用于：
- 缓存热门文章、页面数据
- 会话状态存储
- 限流计数器
- 任务队列（未来扩展）

通过 lifespan 管理连接生命周期，确保应用启动/关闭时正确建立和释放连接。
"""

from __future__ import annotations

import logging
from typing import Any

import redis.asyncio as aioredis

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── 全局客户端 ────────────────────────────────────────────────

_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """获取 Redis 客户端实例（延迟初始化，由 lifespan 管理）。"""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
            decode_responses=True,
        )
    return _redis_client


async def close_redis() -> None:
    """关闭 Redis 连接（在 lifespan shutdown 中调用）。"""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis 连接已关闭")


# ── 便捷操作 ──────────────────────────────────────────────────

async def cache_get(key: str) -> str | None:
    """从 Redis 读取缓存值。"""
    client = await get_redis()
    value: Any = await client.get(key)
    return value


async def cache_set(
    key: str,
    value: str,
    expire: int = 3600,
) -> None:
    """写入 Redis 缓存，可设置过期时间（秒）。"""
    client = await get_redis()
    await client.set(key, value, ex=expire)


async def cache_delete(key: str) -> None:
    """删除 Redis 缓存键。"""
    client = await get_redis()
    await client.delete(key)


async def cache_exists(key: str) -> bool:
    """检查 Redis 缓存键是否存在。"""
    client = await get_redis()
    result: int = await client.exists(key)
    return result > 0
