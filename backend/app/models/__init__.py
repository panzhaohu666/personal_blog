"""
models 子包

SQLAlchemy ORM 数据模型定义与工具函数。
"""

from __future__ import annotations

import re
import unicodedata
import uuid


def make_slug(text: str) -> str:
    """生成 URL 友好的 slug，中文等非 ASCII 文本自动回退到 UUID 短码。

    用法：
        make_slug("Hello World")   → "hello-world"
        make_slug("你好世界")        → "a1b2c3d4e5f6"（UUID 前 12 位）
    """
    # Unicode 标准化 → 试图转 ASCII → 去掉非字母数字
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    slug = re.sub(r"[-\s]+", "-", text)
    if slug:
        return slug
    return str(uuid.uuid4())[:12]


# ── 导入所有模型（确保 Alembic autogenerate 可发现）───────────

from app.models.base import Base  # noqa: E402, F401
from app.models.category import Category  # noqa: E402, F401
from app.models.post import Post, PostStatus, post_tags  # noqa: E402, F401
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
