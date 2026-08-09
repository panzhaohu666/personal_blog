"""
文章标签数据模型
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, event, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models import make_slug


class Tag(Base):
    """文章标签表。"""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # 反向多对多（通过 post_tags 关联）
    posts: Mapped[list["Post"]] = relationship(  # noqa: F821
        secondary="post_tags",
        back_populates="tags",
    )

    def __repr__(self) -> str:
        return f"<Tag(id={self.id}, name={self.name!r})>"


@event.listens_for(Tag, "before_insert")
@event.listens_for(Tag, "before_update")
def _tag_before_write(
    _mapper: object,
    _connection: object,
    target: Tag,
) -> None:
    """自动生成 slug（仅在 slug 为空时）。"""
    if not target.slug:
        target.slug = make_slug(target.name)
