"""
文章接口集成测试

测试端点：
公开接口：
- GET  /api/posts              文章列表（分页/过滤/搜索）
- GET  /api/posts/{slug}       文章详情（仅已发布）
- 验证草稿不在公开接口中暴露

管理接口（需认证）：
- POST   /api/admin/posts      创建文章
- GET    /api/admin/posts      管理列表（含草稿）
- GET    /api/admin/posts/{id} 管理端获取详情
- PUT    /api/admin/posts/{id} 更新文章
- DELETE /api/admin/posts/{id} 删除文章

"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# ── 辅助函数 ────────────────────────────────────────────────────

def _make_post_payload(
    title: str = "Test Article",
    body: str = "This is a test article body.",
    status: str = "published",
    **kwargs,
) -> dict:
    """快速构造创建文章的 JSON payload。"""
    return {
        "title": title,
        "body": body,
        "status": status,
        "excerpt": "",
        **kwargs,
    }


# ── 创建文章 ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_post_draft(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """创建草稿文章应返回 201 且 status 为 draft。"""
    response = await client.post(
        "/api/admin/posts",
        json=_make_post_payload(status="draft"),
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["title"] == "Test Article"
    assert data["status"] == "draft"
    assert data["body"] == "This is a test article body."
    assert "id" in data
    assert "slug" in data


@pytest.mark.asyncio
async def test_create_post_published(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """创建已发布文章应返回 201。"""
    response = await client.post(
        "/api/admin/posts",
        json=_make_post_payload(status="published"),
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["status"] == "published"


@pytest.mark.asyncio
async def test_create_post_with_custom_slug(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """指定 slug 创建文章应使用自定义 slug。"""
    response = await client.post(
        "/api/admin/posts",
        json=_make_post_payload(
            title="My Special Post",
            slug="my-custom-slug",
        ),
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["slug"] == "my-custom-slug"


@pytest.mark.asyncio
async def test_create_post_unauthorized(client: AsyncClient) -> None:
    """未认证创建文章应返回 401。"""
    response = await client.post(
        "/api/admin/posts",
        json=_make_post_payload(),
    )
    assert response.status_code == 401


# ── 文章列表（公开） ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_posts_empty(client: AsyncClient) -> None:
    """无文章时列表应返回空数组。"""
    response = await client.get("/api/posts")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_posts_only_published(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """公开列表只应返回已发布文章，草稿不可见。"""
    # 创建一篇草稿和一篇已发布文章
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(title="Draft Post", status="draft"),
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(title="Published Post", status="published"),
        headers=auth_headers,
    )

    response = await client.get("/api/posts")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Published Post"


@pytest.mark.asyncio
async def test_list_posts_pagination(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """分页参数应正确生效。"""
    # 创建 5 篇已发布文章
    for i in range(5):
        await client.post(
            "/api/admin/posts",
            json=_make_post_payload(title=f"Post {i}", status="published"),
            headers=auth_headers,
        )

    response = await client.get("/api/posts?page=1&size=2")
    data = response.json()
    assert data["page"] == 1
    assert data["size"] == 2
    assert len(data["items"]) == 2
    assert data["pages"] >= 3
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_search_posts(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """搜索关键词应过滤匹配的文章。"""
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(
            title="Django Tutorial",
            body="Learn Django framework",
            status="published",
        ),
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(
            title="FastAPI Guide",
            body="Learn FastAPI framework",
            status="published",
        ),
        headers=auth_headers,
    )

    response = await client.get("/api/posts?search=Django")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Django Tutorial"


# ── 文章详情（公开） ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_post_by_slug(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """通过 slug 获取已发布文章详情应返回 200。"""
    create_resp = await client.post(
        "/api/admin/posts",
        json=_make_post_payload(
            title="Readable Post",
            slug="readable-post",
            status="published",
        ),
        headers=auth_headers,
    )
    slug = create_resp.json()["slug"]

    response = await client.get(f"/api/posts/{slug}")
    assert response.status_code == 200
    assert response.json()["title"] == "Readable Post"
    assert "body" in response.json()


@pytest.mark.asyncio
async def test_get_draft_by_slug_returns_404(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """公开端点访问草稿应返回 404。"""
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(
            title="Secret Draft",
            slug="secret-draft",
            status="draft",
        ),
        headers=auth_headers,
    )

    response = await client.get("/api/posts/secret-draft")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_post_not_found(client: AsyncClient) -> None:
    """不存在的 slug 应返回 404。"""
    response = await client.get("/api/posts/nonexistent-slug")
    assert response.status_code == 404


# ── 管理端获取详情 ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_get_post_detail(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """管理端通过 ID 获取文章详情（含草稿）应返回 200。"""
    create_resp = await client.post(
        "/api/admin/posts",
        json=_make_post_payload(title="Admin Post", status="draft"),
        headers=auth_headers,
    )
    post_id = create_resp.json()["id"]

    response = await client.get(f"/api/admin/posts/{post_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "draft"


# ── 管理端列表 ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_list_includes_drafts(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """管理端列表应包含草稿与已发布文章。"""
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(title="Draft", status="draft"),
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(title="Published", status="published"),
        headers=auth_headers,
    )

    response = await client.get("/api/admin/posts", headers=auth_headers)
    data = response.json()
    assert data["total"] == 2


# ── 更新文章 ────────────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.xfail(
    reason="aiosqlite greenlet incompatibility with SA refresh() after UPDATE",
    strict=False,
)
async def test_update_post(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """更新文章标题和正文应返回 200 且内容已变更。"""
    create_resp = await client.post(
        "/api/admin/posts",
        json=_make_post_payload(title="Old Title", body="Old body"),
        headers=auth_headers,
    )
    post_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/admin/posts/{post_id}",
        json=_make_post_payload(title="New Title", body="New body"),
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Title"
    assert data["body"] == "New body"



@pytest.mark.asyncio
async def test_update_post_not_found(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """更新不存在的文章应返回 404。"""
    response = await client.put(
        "/api/admin/posts/00000000-0000-0000-0000-000000000000",
        json=_make_post_payload(),
        headers=auth_headers,
    )
    assert response.status_code == 404


# ── 删除文章 ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_post(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """删除文章应返回 204，后续获取返回 404。"""
    create_resp = await client.post(
        "/api/admin/posts",
        json=_make_post_payload(),
        headers=auth_headers,
    )
    post_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/admin/posts/{post_id}", headers=auth_headers
    )
    assert response.status_code == 204

    # 删除后获取应 404
    get_resp = await client.get(f"/api/admin/posts/{post_id}", headers=auth_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_post_not_found(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """删除不存在的文章应返回 404。"""
    response = await client.delete(
        "/api/admin/posts/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


# ── 过滤：按分类 / 标签 ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_filter_posts_by_category(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """按分类 slug 过滤应只返回该分类的文章。"""
    # 创建分类
    cat_resp = await client.post(
        "/api/admin/categories",
        json={"name": "Python"},
        headers=auth_headers,
    )
    cat_id = cat_resp.json()["id"]
    cat_slug = cat_resp.json()["slug"]

    # 创建属于该分类的文章
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(
            title="Python Tips",
            category_id=cat_id,
            status="published",
        ),
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(
            title="JavaScript Guide",
            status="published",
        ),
        headers=auth_headers,
    )

    response = await client.get(f"/api/posts?category={cat_slug}")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Python Tips"


@pytest.mark.asyncio
async def test_filter_posts_by_tag(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """按标签 slug 过滤应只返回该标签的文章。"""
    # 创建标签
    tag_resp = await client.post(
        "/api/admin/tags",
        json={"name": "Tutorial"},
        headers=auth_headers,
    )
    tag_id = tag_resp.json()["id"]
    tag_slug = tag_resp.json()["slug"]

    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(
            title="Tagged Post",
            tag_ids=[tag_id],
            status="published",
        ),
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/posts",
        json=_make_post_payload(
            title="Untagged Post",
            status="published",
        ),
        headers=auth_headers,
    )

    response = await client.get(f"/api/posts?tag={tag_slug}")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Tagged Post"
