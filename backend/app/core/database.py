"""
异步数据库模块

提供基于 SQLAlchemy 2.0 的异步数据库引擎与会话工厂。
- 使用 asyncpg 驱动连接 PostgreSQL
- 支持 SQLite（开发/测试），通过 render_as_batch 兼容
- 通过 lifespan 事件管理引擎生命周期

用法：
    from app.core.database import get_db, async_session_factory

    async with async_session_factory() as session:
        result = await session.execute(select(User))
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# ── 引擎 ──────────────────────────────────────────────────────

DATABASE_URL = settings.DATABASE_URL.get_secret_value()

connect_args: dict[str, Any] = {}
if settings.DATABASE_IS_SQLITE:
    connect_args["check_same_thread"] = False

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args=connect_args,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── 声明式基类 ────────────────────────────────────────────────

class Base(DeclarativeBase):
    """ORM 声明式基类，所有模型继承自此。"""
    pass


# ── 依赖注入 ──────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 依赖：获取数据库会话，请求结束后自动关闭。"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db() -> None:
    """关闭数据库引擎，释放连接池（在 lifespan shutdown 中调用）。"""
    await engine.dispose()
