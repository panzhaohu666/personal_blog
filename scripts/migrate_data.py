#!/usr/bin/env python3
"""
数据迁移脚本：Django SQLite → PostgreSQL (SQLAlchemy async)。

读取 db.sqlite3 中的 Django 数据（使用 sqlite3 标准库，不依赖 Django），
导入到 PostgreSQL 对应的 SQLAlchemy 模型中。

迁移顺序：Category → Tag → User → Post → PostTags

用法：
    python scripts/migrate_data.py              # 执行迁移
    python scripts/migrate_data.py --dry-run    # 仅验证，不写入数据库
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sqlite3
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

# ── 路径设置：将 backend/ 加入 sys.path 以便导入 app.* ──

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_BACKEND_DIR = _PROJECT_ROOT / "backend"
sys.path.insert(0, str(_BACKEND_DIR))

# ── 外部依赖 ──────────────────────────────────────────────────

import bcrypt  # noqa: E402
from sqlalchemy import select, text  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.database import async_session_factory, engine  # noqa: E402
from app.models import Category, Post, PostStatus, Tag, User, post_tags  # noqa: E402

# ── 日志 ──────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("migrate")

# ── 常量 ──────────────────────────────────────────────────────

DJANGO_DB = _PROJECT_ROOT / "db.sqlite3"
DJANGO_TIMEZONE = timezone(timedelta(hours=8), name="Asia/Shanghai")
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"
DEFAULT_ADMIN_EMAIL = "admin@test.com"

# ── 映射表（old int ID → new ID/UUID） ────────────────────────
# 说明：
#   Category / Tag 使用 autoincrement Integer PK → new_id: int
#   Post 使用 UUID PK                        → new_id: uuid.UUID
#   User 直接创建新管理员，不需要映射

cat_id_map: dict[int, int] = {}   # old_django_category_id → new_pg_category_id
tag_id_map: dict[int, int] = {}   # old_django_tag_id      → new_pg_tag_id
post_id_map: dict[int, uuid.UUID] = {}  # old_django_post_id → new_pg_post_uuid


# ═══════════════════════════════════════════════════════════════
# 辅助函数
# ═══════════════════════════════════════════════════════════════


def parse_django_dt(value: str | None) -> datetime | None:
    """将 Django SQLite 的 naive datetime 字符串转为 Asia/Shanghai aware datetime。"""
    if not value:
        return None
    # 格式：'2026-08-01 00:46:04.477828'
    dt = datetime.strptime(value, "%Y-%m-%d %H:%M:%S.%f")
    return dt.replace(tzinfo=DJANGO_TIMEZONE)


def convert_image_path(django_image: str | None) -> str | None:
    """将 Django 的相对路径 'posts/2026/08/img.jpg' 转为 '/media/posts/2026/08/img.jpg'。"""
    if not django_image:
        return None
    return f"/media/{django_image}"


def gen_bcrypt_hash(password: str) -> str:
    """生成 bcrypt 密码哈希。"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()



# ═══════════════════════════════════════════════════════════════
# 各实体迁移逻辑
# ═══════════════════════════════════════════════════════════════


async def migrate_users(
    session: Any,
    dry_run: bool,
) -> int:
    """创建管理员用户（idempotent：基于 username 去重）。

    Django 使用 pbkdf2_sha256 哈希，新系统使用 bcrypt。
    我们直接创建一个新的 admin 用户，密码为 'admin123' 的 bcrypt 哈希。

    Returns:
        imported: 实际插入的用户数（0 或 1）
    """
    logger.info("── 迁移用户 ──")

    # 检查是否已存在
    stmt = select(User).where(User.username == DEFAULT_ADMIN_USERNAME)
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing is not None:
        logger.info("  用户 '%s' 已存在，跳过。", DEFAULT_ADMIN_USERNAME)
        return 0

    if dry_run:
        logger.info("  [DRY-RUN] 将创建用户: username=%s, email=%s", DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL)
        return 0

    password_hash = gen_bcrypt_hash(DEFAULT_ADMIN_PASSWORD)
    now = datetime.now(timezone.utc)

    user = User(
        username=DEFAULT_ADMIN_USERNAME,
        email=DEFAULT_ADMIN_EMAIL,
        hashed_password=password_hash,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    await session.flush()
    logger.info("  ✓ 创建用户: username=%s", DEFAULT_ADMIN_USERNAME)
    return 1


async def migrate_categories(
    session: Any,
    dry_run: bool,
    sqlite_conn: sqlite3.Connection,
) -> int:
    """从 Django SQLite 迁移分类到 PostgreSQL。

    策略：按 slug 去重。对每条 Django 记录：
    - 若 PostgreSQL 中已有同名 slug → 记录其 id 到 cat_id_map，跳过
    - 若不存在 → 插入，获取新 id 并记录到 cat_id_map

    Returns:
        imported: 实际插入的分类数
    """
    logger.info("── 迁移分类 ──")
    imported = 0

    cur = sqlite_conn.execute(
        "SELECT id, name, slug FROM blog_category ORDER BY id"
    )
    rows = cur.fetchall()

    for django_id, name, slug in rows:
        # 检查是否已存在
        stmt = select(Category).where(Category.slug == slug)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing is not None:
            cat_id_map[django_id] = existing.id
            logger.info("  跳过 '%s' (slug=%s) — 已存在 (pg_id=%d)", name, slug, existing.id)
            continue

        if dry_run:
            logger.info("  [DRY-RUN] 将创建分类: name=%s, slug=%s", name, slug)
            continue

        # 插入新记录
        cat = Category(
            name=name,
            slug=slug,
            # created_at 由 server_default=func.now() 自动设置
        )
        session.add(cat)
        await session.flush()
        cat_id_map[django_id] = cat.id
        imported += 1
        logger.info("  ✓ 创建分类: id=%d, name=%s, slug=%s", cat.id, name, slug)

    return imported


async def migrate_tags(
    session: Any,
    dry_run: bool,
    sqlite_conn: sqlite3.Connection,
) -> int:
    """从 Django SQLite 迁移标签到 PostgreSQL。

    策略同 migrate_categories：按 slug 去重。

    Returns:
        imported: 实际插入的标签数
    """
    logger.info("── 迁移标签 ──")
    imported = 0

    cur = sqlite_conn.execute(
        "SELECT id, name, slug FROM blog_tag ORDER BY id"
    )
    rows = cur.fetchall()

    for django_id, name, slug in rows:
        stmt = select(Tag).where(Tag.slug == slug)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing is not None:
            tag_id_map[django_id] = existing.id
            logger.info("  跳过 '%s' (slug=%s) — 已存在 (pg_id=%d)", name, slug, existing.id)
            continue

        if dry_run:
            logger.info("  [DRY-RUN] 将创建标签: name=%s, slug=%s", name, slug)
            continue

        tag = Tag(name=name, slug=slug)
        session.add(tag)
        await session.flush()
        tag_id_map[django_id] = tag.id
        imported += 1
        logger.info("  ✓ 创建标签: id=%d, name=%s, slug=%s", tag.id, name, slug)

    return imported


async def migrate_posts(
    session: Any,
    dry_run: bool,
    sqlite_conn: sqlite3.Connection,
) -> int:
    """从 Django SQLite 迁移文章到 PostgreSQL。

    策略：
    - 按 slug 去重
    - category_id 通过 cat_id_map 映射（Django int ID → PG int ID）
    - image 路径加上 /media/ 前缀
    - status 字符串转为 PostStatus 枚举
    - 时间戳转为 Asia/Shanghai aware datetime

    Returns:
        imported: 实际插入的文章数
    """
    logger.info("── 迁移文章 ──")
    imported = 0

    cur = sqlite_conn.execute(
        "SELECT id, title, slug, category_id, image, excerpt, body, status, "
        "created_at, updated_at FROM blog_post ORDER BY id"
    )
    rows = cur.fetchall()

    for row in rows:
        (
            django_id,
            title,
            slug,
            dj_cat_id,
            image,
            excerpt,
            body,
            status_str,
            created_at_str,
            updated_at_str,
        ) = row

        # 检查是否已存在
        stmt = select(Post).where(Post.slug == slug)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing is not None:
            post_id_map[django_id] = existing.id
            logger.info("  跳过 '%s' (slug=%s) — 已存在 (pg_id=%s)", title, slug, existing.id)
            continue

        if dry_run:
            mapped_cat = cat_id_map.get(dj_cat_id) if dj_cat_id else None
            logger.info(
                "  [DRY-RUN] 将创建文章: title=%s, slug=%s, category_id=%s→%s, status=%s",
                title, slug, dj_cat_id, mapped_cat, status_str,
            )
            continue

        # 构建 Post 对象
        new_id = uuid.uuid4()
        post_id_map[django_id] = new_id

        try:
            status_enum = PostStatus(status_str)
        except ValueError:
            logger.warning("  未知状态 '%s'，默认设为 draft", status_str)
            status_enum = PostStatus.DRAFT

        post = Post(
            id=new_id,
            title=title,
            slug=slug,
            category_id=cat_id_map.get(dj_cat_id) if dj_cat_id else None,
            image_url=convert_image_path(image),
            excerpt=excerpt if excerpt else "",
            body=body,
            status=status_enum,
            created_at=parse_django_dt(created_at_str),
            updated_at=parse_django_dt(updated_at_str),
        )

        session.add(post)
        await session.flush()
        imported += 1
        logger.info(
            "  ✓ 创建文章: id=%s, title=%s, slug=%s, status=%s",
            post.id, title, slug, status_enum.value,
        )

    return imported


async def migrate_post_tags(
    session: Any,
    dry_run: bool,
    sqlite_conn: sqlite3.Connection,
) -> int:
    """从 Django SQLite 迁移文章-标签关联到 PostgreSQL post_tags 表。

    策略：
    - 通过 post_id_map 和 tag_id_map 转换 FK
    - 对已存在的 (post_id, tag_id) 组合跳过

    Returns:
        imported: 实际插入的关联数
    """
    logger.info("── 迁移文章-标签关联 ──")
    imported = 0

    cur = sqlite_conn.execute(
        "SELECT post_id, tag_id FROM blog_post_tags ORDER BY post_id, tag_id"
    )
    rows = cur.fetchall()

    for dj_post_id, dj_tag_id in rows:
        new_post_id = post_id_map.get(dj_post_id)
        new_tag_id = tag_id_map.get(dj_tag_id)

        if new_post_id is None:
            logger.warning("  post_id=%d 无映射（文章未成功迁移），跳过", dj_post_id)
            continue
        if new_tag_id is None:
            logger.warning("  tag_id=%d 无映射（标签未成功迁移），跳过", dj_tag_id)
            continue

        # 检查关联是否已存在
        stmt = select(post_tags).where(
            (post_tags.c.post_id == new_post_id) & (post_tags.c.tag_id == new_tag_id)
        )
        result = await session.execute(stmt)
        if result.first() is not None:
            logger.info("  跳过 post=%s, tag=%d — 关联已存在", new_post_id, new_tag_id)
            continue

        if dry_run:
            logger.info(
                "  [DRY-RUN] 将创建关联: post_id=%d→%s, tag_id=%d→%d",
                dj_post_id, new_post_id, dj_tag_id, new_tag_id,
            )
            continue

        stmt = post_tags.insert().values(post_id=new_post_id, tag_id=new_tag_id)
        await session.execute(stmt)
        imported += 1
        logger.info("  ✓ 创建关联: post=%s, tag=%d", new_post_id, new_tag_id)

    return imported


# ═══════════════════════════════════════════════════════════════
# 主流程
# ═══════════════════════════════════════════════════════════════


async def run_migration(dry_run: bool) -> None:
    """执行完整的数据迁移流程。"""

    # ── 0. 前置检查 ──────────────────────────────────────

    if not DJANGO_DB.exists():
        logger.error("❌ Django SQLite 数据库不存在: %s", DJANGO_DB)
        logger.error("   请先运行 Django 项目生成数据库。")
        sys.exit(1)

    settings = get_settings()
    db_url = settings.DATABASE_URL.get_secret_value()
    logger.info("数据源: %s", DJANGO_DB)
    logger.info("目标库: %s", db_url.rpartition("@")[2] if "@" in db_url else db_url)
    if dry_run:
        logger.info("⚠ DRY-RUN 模式：不会写入数据库")

    # ── 1. 验证数据库连接 ────────────────────────────────

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("✓ PostgreSQL 连接正常")
    except Exception as e:
        logger.error("❌ PostgreSQL 连接失败: %s", e)
        logger.error("   请确保 PostgreSQL 已启动，且 DATABASE_URL 配置正确。")
        sys.exit(1)

    # ── 2. 读取 SQLite 并迁移 ────────────────────────────

    sqlite_conn: sqlite3.Connection | None = None
    try:
        sqlite_conn = sqlite3.connect(str(DJANGO_DB))
        sqlite_conn.row_factory = sqlite3.Row
    except Exception as e:
        logger.error("❌ 无法打开 SQLite 数据库: %s", e)
        sys.exit(1)

    counts: dict[str, int] = {}

    try:
        async with async_session_factory() as session:
            # 按依赖顺序迁移
            counts["categories"] = await migrate_categories(session, dry_run, sqlite_conn)
            counts["tags"] = await migrate_tags(session, dry_run, sqlite_conn)
            counts["users"] = await migrate_users(session, dry_run)
            counts["posts"] = await migrate_posts(session, dry_run, sqlite_conn)
            # Posts 必须先 flush 以使 UUID 可用，post_tags 迁移在 posts 之后
            if not dry_run:
                await session.flush()
            counts["post_tags"] = await migrate_post_tags(session, dry_run, sqlite_conn)

            if dry_run:
                await session.rollback()
            else:
                await session.commit()
    except Exception as e:
        logger.exception("❌ 迁移过程中发生错误: %s", e)
        sqlite_conn.close()
        sys.exit(1)
    finally:
        sqlite_conn.close()

    # ── 3. 输出摘要 ──────────────────────────────────────

    mode = "DRY-RUN 验证" if dry_run else "迁移"
    print()
    print("=" * 50)
    print(f"  {mode}完成")
    print("=" * 50)
    print(f"  用户:         {counts.get('users', 0):>4} 条")
    print(f"  分类:         {counts.get('categories', 0):>4} 条")
    print(f"  标签:         {counts.get('tags', 0):>4} 条")
    print(f"  文章:         {counts.get('posts', 0):>4} 条")
    print(f"  文章-标签关联: {counts.get('post_tags', 0):>4} 条")
    print("=" * 50)

    total = sum(counts.values())
    if not dry_run and total > 0:
        logger.info("已成功导入 %d 条记录到 PostgreSQL。", total)
    elif total == 0:
        logger.info("没有新记录需要导入（所有数据已存在）。")


# ── 入口 ──────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Django SQLite → PostgreSQL 数据迁移（SQLAlchemy async）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="仅验证数据，不写入数据库",
    )
    args = parser.parse_args()
    asyncio.run(run_migration(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
