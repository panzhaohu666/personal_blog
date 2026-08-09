"""
访问统计接口集成测试

测试端点：
- GET /api/stats/overview      站点总览统计
- GET /api/stats/posts/{id}    单篇文章访问统计
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# ── GET /api/stats/overview ─────────────────────────────────────

@pytest.mark.asyncio
async def test_stats_overview_empty(client: AsyncClient) -> None:
    """无数据时总览应返回全 0 的统计。"""
    response = await client.get("/api/stats/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["total_posts"] == 0
    assert data["published_posts"] == 0
    assert data["total_views"] == 0
    assert data["total_categories"] == 0
    assert data["total_tags"] == 0


@pytest.mark.asyncio
async def test_stats_overview_with_data(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """创建文章和分类标签后总览应反映正确的计数。"""
    # 创建分类和标签
    await client.post(
        "/api/admin/categories",
        json={"name": "Tech"},
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/tags",
        json={"name": "Guide"},
        headers=auth_headers,
    )

    # 创建 2 篇已发布 + 1 篇草稿
    await client.post(
        "/api/admin/posts",
        json={
            "title": "Post 1",
            "body": "content 1",
            "status": "published",
            "excerpt": "",
        },
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/posts",
        json={
            "title": "Post 2",
            "body": "content 2",
            "status": "published",
            "excerpt": "",
        },
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/posts",
        json={
            "title": "Draft 1",
            "body": "content 3",
            "status": "draft",
            "excerpt": "",
        },
        headers=auth_headers,
    )

    response = await client.get("/api/stats/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["total_posts"] == 3
    assert data["published_posts"] == 2
    assert data["total_categories"] == 1
    assert data["total_tags"] == 1
    # total_views 来自 mock Redis（默认为 0）
    assert isinstance(data["total_views"], int)


# ── GET /api/stats/posts/{id} ──────────────────────────────────

@pytest.mark.asyncio
async def test_post_stats(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """获取单篇文章统计应返回正确的文章信息。"""
    create_resp = await client.post(
        "/api/admin/posts",
        json={
            "title": "Stats Post",
            "body": "Stats content",
            "status": "published",
            "excerpt": "",
        },
        headers=auth_headers,
    )
    post_id = create_resp.json()["id"]

    response = await client.get(f"/api/stats/posts/{post_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["post_id"] == post_id
    assert data["post_title"] == "Stats Post"
    assert isinstance(data["view_count"], int)
    assert isinstance(data["today_views"], int)


@pytest.mark.asyncio
async def test_post_stats_not_found(client: AsyncClient) -> None:
    """获取不存在文章的统计应返回 404。"""
    response = await client.get(
        "/api/stats/posts/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 404
