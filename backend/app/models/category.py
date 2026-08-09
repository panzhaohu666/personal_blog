"""
文章分类数据模型
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, event, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models import make_slug


class Category(Base):
    """文章分类表。"""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # 反向关系（由 Post.category 的 back_populates 配对）
    posts: Mapped[list["Post"]] = relationship(  # noqa: F821
        back_populates="category",
    )

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name={self.name!r})>"


@event.listens_for(Category, "before_insert")
@event.listens_for(Category, "before_update")
def _category_before_write(
    _mapper: object,
    _connection: object,
    target: Category,
) -> None:
    """自动生成 slug（仅在 slug 为空时）。"""
    if not target.slug:
        target.slug = make_slug(target.name)
