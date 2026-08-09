"""
pytest 测试配置与共享 fixtures

提供：
- 异步 SQLite 测试数据库引擎
- 数据库会话（每次测试独立事务，自动回滚）
- 测试用户 fixture（用于认证测试）
- 带认证头的 AsyncClient fixture
- Redis 模拟（避免依赖真实 Redis）

用法：
    async def test_something(client: AsyncClient, auth_headers: dict) -> None:
        response = await client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
"""

from __future__ import annotations

import os
import sys
from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ── 环境变量必须在所有 app 导入之前设置 ─────────────────────────
os.environ.setdefault("DATABASE_IS_SQLITE", "true")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("ELASTICSEARCH_URL", "http://localhost:9200")

# 确保 backend 根目录在 sys.path 中（Alembic env.py 需要）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ── SQLite TSVECTOR 兼容：将 PostgreSQL TSVECTOR 映射为 TEXT ──────

import uuid as _uuid_mod
from datetime import datetime as _datetime
from functools import wraps
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID as PgUUID  # noqa: E402
from sqlalchemy.ext.compiler import compiles  # noqa: E402


@compiles(TSVECTOR, "sqlite")  # type: ignore[arg-type]
def _compile_tsvector_sqlite(element: object, compiler: object, **kw: object) -> str:
    return "TEXT"


_original_uuid_bind = PgUUID.bind_processor


@wraps(PgUUID.bind_processor)
def _patched_uuid_bind(self: object, dialect: object) -> object:
    original = _original_uuid_bind(self, dialect)
    if original is None:
        return None
    def _wrapped(value: object) -> object:
        if isinstance(value, str):
            value = _uuid_mod.UUID(value)
        return original(value)
    return _wrapped


PgUUID.bind_processor = _patched_uuid_bind  # type: ignore[method-assign]


# ── Redis 全局 mock ─────────────────────────────────────────────

def _make_mock_redis() -> AsyncMock:
    """创建一个行为类似 Redis 的 AsyncMock（用于测试）。"""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=1)
    mock.exists = AsyncMock(return_value=0)
    mock.incr = AsyncMock(return_value=1)
    mock.mget = AsyncMock(return_value=[])
    mock.scan = AsyncMock(return_value=(0, []))
    mock.aclose = AsyncMock()
    return mock


# 模块级 patch：替换整个 redis 模块的 get_redis / close_redis
_mock_redis_instance = _make_mock_redis()
_redis_patch = patch(
    "app.core.redis.get_redis",
    new=AsyncMock(return_value=_mock_redis_instance),
)
_close_redis_patch = patch("app.core.redis.close_redis", new=AsyncMock())
_redis_patch.start()
_close_redis_patch.start()


# ── 应用导入（在 env 和 mock 之后）──────────────────────────────

from app.core.database import Base, get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402
from app.schemas.auth import UserResponse  # noqa: E402


# ── Pydantic + SQLite 兼容补丁 ──────────────────────────────────

from app.models.post import PostStatus  # noqa: E402

# --- PostStatus：确保 SQLite 返回的字符串被识别为枚举成员 ---
PostStatus._value2member_map_ = {m.value: m for m in PostStatus}

# SQLAlchemy load 事件：将 status 列从字符串转换为 PostStatus 枚举
from sqlalchemy import event  # noqa: E402
from app.models.post import Post as PostModel  # noqa: E402


@event.listens_for(PostModel, "load")  # type: ignore[misc]
def _coerce_post_status(target: PostModel, context: object) -> None:
    if isinstance(target.status, str):
        target.status = PostStatus(target.status)


# --- UserResponse：from_attributes 时 UUID/datetime → str 强制转换 ---
_orig_user_validate = UserResponse.model_validate


@classmethod  # type: ignore[arg-type]
def _patched_user_validate(cls, obj, **kwargs):
    if hasattr(obj, "id") and isinstance(obj.id, _uuid_mod.UUID):
        obj = {
            "id": str(obj.id),
            "username": getattr(obj, "username", ""),
            "email": getattr(obj, "email", None),
            "is_active": getattr(obj, "is_active", True),
            "created_at": str(getattr(obj, "created_at", "")),
        }
    elif hasattr(obj, "id") and isinstance(getattr(obj, "created_at", None), _datetime):
        obj = {k: v for k, v in vars(obj).items() if k in cls.model_fields}
        obj["id"] = str(obj["id"]) if isinstance(obj.get("id"), _uuid_mod.UUID) else obj.get("id")
        obj["created_at"] = str(obj["created_at"]) if isinstance(obj.get("created_at"), _datetime) else obj.get("created_at")
    return _orig_user_validate(obj, **kwargs)


UserResponse.model_validate = _patched_user_validate  # type: ignore[method-assign]


# ── Pytest 配置 ─────────────────────────────────────────────────

@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """指定 anyio 异步后端为 asyncio。"""
    return "asyncio"


@pytest_asyncio.fixture(scope="session")
async def test_engine() -> AsyncGenerator[Any, None]:
    """会话级异步 SQLite 测试引擎，所有测试共享。"""
    engine = create_async_engine(
        "sqlite+aiosqlite:///./test.db",
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

    # 清理测试数据库文件
    db_file = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "test.db"
    )
    if os.path.exists(db_file):
        os.remove(db_file)


@pytest_asyncio.fixture
async def db_session(
    test_engine: Any,
) -> AsyncGenerator[AsyncSession, None]:
    """每次测试获取独立数据库会话，测试结束后自动回滚。"""
    factory = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with factory() as session:
        yield session
        await session.rollback()
        await session.close()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """创建测试用户并持久化到测试数据库。

    用户名: testuser，密码: testpass123。
    若用户已在先前测试中创建（同一引擎），则直接返回已有用户。
    """
    from sqlalchemy import select

    result = await db_session.execute(
        select(User).where(User.username == "testuser")
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing

    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=hash_password("testpass123"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def client(
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient 通过 ASGI transport 直接调用 FastAPI 应用。

    数据库依赖被覆写为测试会话，Redis 已在模块级被 mock。
    """

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(
    client: AsyncClient, test_user: User
) -> dict[str, str]:
    """通过生成 JWT access token 获取认证头，避免每次都调用 login 端点。"""
    from app.core.security import create_access_token

    token = create_access_token(
        data={
            "sub": str(test_user.id),
            "username": test_user.username,
            "type": "access",
        }
    )
    return {"Authorization": f"Bearer {token}"}
