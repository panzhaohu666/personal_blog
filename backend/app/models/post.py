"""
文章数据模型（含多对多标签关联表）
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    event,
    func,
)
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models import make_slug


class PostStatus(str, enum.Enum):
    """文章发布状态。"""

    DRAFT = "draft"
    PUBLISHED = "published"


# ── 多对多关联表 ────────────────────────────────────────────────

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column(
        "post_id",
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        Integer,
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ── Post 模型 ──────────────────────────────────────────────────

class Post(Base):
    """文章表。"""

    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    category_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR, nullable=True, deferred=True
    )
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[PostStatus] = mapped_column(
        String(10), default=PostStatus.DRAFT, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── 关系 ───────────────────────────────────────────────────
    category: Mapped["Category | None"] = relationship(  # noqa: F821
        back_populates="posts",
    )
    tags: Mapped[list["Tag"]] = relationship(  # noqa: F821
        secondary=post_tags,
        back_populates="posts",
    )

    def __repr__(self) -> str:
        return f"<Post(id={self.id}, title={self.title!r}, status={self.status.value!r})>"


# ── 事件监听 ───────────────────────────────────────────────────

@event.listens_for(Post, "before_insert")
@event.listens_for(Post, "before_update")
def _post_before_write(
    _mapper: object,
    _connection: object,
    target: Post,
) -> None:
    """自动生成 slug（仅在 slug 为空时）。"""
    if not target.slug:
        target.slug = make_slug(target.title)
