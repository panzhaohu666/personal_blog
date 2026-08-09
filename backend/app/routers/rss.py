"""
RSS 订阅路由

生成 RSS 2.0 XML 格式的最新文章订阅。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from feedgen.feed import FeedGenerator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.post import Post, PostStatus

router = APIRouter()
settings = get_settings()


@router.get(
    "/blog/rss.xml",
    tags=["RSS"],
)
async def rss_feed(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """RSS 2.0 XML 订阅，包含最新 20 篇已发布文章。"""
    stmt = (
        select(Post)
        .where(Post.status == PostStatus.PUBLISHED)
        .order_by(Post.created_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    posts = result.scalars().all()

    fg = FeedGenerator()
    fg.title(settings.SITE_TITLE)
    fg.description(settings.SITE_DESCRIPTION)
    fg.link(href=settings.SITE_URL, rel="self")
    fg.link(href=f"{settings.SITE_URL}/blog/rss.xml", rel="alternate", type="application/rss+xml")
    fg.language("zh-CN")

    for post in posts:
        fe = fg.add_entry()
        fe.title(post.title)
        fe.link(href=f"{settings.SITE_URL}/blog/post/{post.slug}")
        fe.description(post.excerpt or "")
        fe.pubDate(post.created_at.strftime("%a, %d %b %Y %H:%M:%S +0000"))
        fe.guid(f"{settings.SITE_URL}/blog/post/{post.slug}", permalink=True)

    rss_xml = fg.rss_str(pretty=True)
    return Response(
        content=rss_xml,
        media_type="application/rss+xml",
    )
