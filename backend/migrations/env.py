"""
Alembic 迁移环境配置

异步 PostgreSQL 迁移环境：
- 从 app.core.config 读取 DATABASE_URL
- 支持使用 sync URL 运行迁移（Alembic 本身是同步的）
- 若使用 SQLite，自动启用 render_as_batch 兼容

运行方式（在 backend/ 目录下）：
    alembic upgrade head
    alembic revision --autogenerate -m "create users table"
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import Connection

from app.core.config import get_settings
from app.core.database import Base

# 导入所有模型，确保其元数据注册到 Base.metadata
import app.models  # noqa: F401

# ── Alembic Config 对象 ───────────────────────────────────────

# 此处 config 是 alembic 注入的上下文对象
config = context.config

# 读取日志配置
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── 元数据 ────────────────────────────────────────────────────

# target_metadata 指向所有模型的元数据，autogenerate 会扫描它
target_metadata = Base.metadata

settings = get_settings()

# 覆盖 sqlalchemy.url：使用同步版本（Alembic 迁移是同步的）
config.set_main_option("sqlalchemy.url", settings.SYNC_DATABASE_URL)

# SQLite 兼容：使用批次模式（ALTER TABLE 替代完整重建）
RENDER_AS_BATCH = settings.DATABASE_IS_SQLITE


# ── 迁移执行 ──────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """离线模式：生成 SQL 脚本，不连接数据库。

    配置中的 url 会直接使用，不创建引擎。
    适用于审查迁移生成的 SQL。
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=RENDER_AS_BATCH,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """在已有数据库连接上运行迁移。"""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=RENDER_AS_BATCH,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在线模式：实时连接数据库运行迁移。"""
    url = config.get_main_option("sqlalchemy.url")
    connectable = create_engine(url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        do_run_migrations(connection)

    connectable.dispose()


# ── 入口 ──────────────────────────────────────────────────────

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
