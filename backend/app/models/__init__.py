"""
models 子包

SQLAlchemy ORM 数据模型定义与工具函数。
"""

from __future__ import annotations

# ── 导入所有模型（确保 Alembic autogenerate 可发现）───────────
from app.models.base import Base  # noqa: E402, F401
from app.models.category import Category  # noqa: E402, F401
from app.models.post import Post, PostStatus, post_tags  # noqa: E402, F401
from app.models.slug import make_slug  # noqa: E402, F401
from app.models.tag import Tag  # noqa: E402, F401
from app.models.user import User  # noqa: E402, F401
from app.models.visit import VisitLog  # noqa: E402, F401

__all__ = [
    "Base",
    "Category",
    "Post",
    "PostStatus",
    "Tag",
    "User",
    "VisitLog",
    "make_slug",
    "post_tags",
]
