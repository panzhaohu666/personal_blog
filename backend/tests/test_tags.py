"""
标签接口集成测试

测试端点：
- GET    /api/tags                   公开列表
- POST   /api/admin/tags            创建标签（需认证）
- DELETE /api/admin/tags/{id}       删除标签（需认证）
- 唯一性约束：同名标签创建返回 409
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# ── GET /api/tags ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_tags_empty(client: AsyncClient) -> None:
    """无标签时应返回空数组。"""
    response = await client.get("/api/tags")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_tags_with_data(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """创建标签后列表应返回标签数据。"""
    await client.post(
        "/api/admin/tags",
        json={"name": "Python"},
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/tags",
        json={"name": "FastAPI"},
        headers=auth_headers,
    )

    response = await client.get("/api/tags")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {item["name"] for item in data}
    assert names == {"Python", "FastAPI"}


# ── POST /api/admin/tags ───────────────────────────────────────

@pytest.mark.asyncio
async def test_create_tag(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """创建标签应返回 201 并包含正确字段。"""
    response = await client.post(
        "/api/admin/tags",
        json={"name": "Tutorial"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Tutorial"
    assert "id" in data
    assert "slug" in data
    assert data["post_count"] == 0


@pytest.mark.asyncio
async def test_create_tag_duplicate(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """创建同名标签应返回 409 Conflict。"""
    await client.post(
        "/api/admin/tags",
        json={"name": "UniqueTag"},
        headers=auth_headers,
    )

    response = await client.post(
        "/api/admin/tags",
        json={"name": "UniqueTag"},
        headers=auth_headers,
    )
    assert response.status_code == 409
    assert "已存在" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_tag_unauthorized(client: AsyncClient) -> None:
    """未认证创建标签应返回 401。"""
    response = await client.post(
        "/api/admin/tags",
        json={"name": "Unauthorized"},
    )
    assert response.status_code == 401


# ── DELETE /api/admin/tags/{id} ────────────────────────────────

@pytest.mark.asyncio
async def test_delete_tag(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """删除存在的标签应返回 204。"""
    create_resp = await client.post(
        "/api/admin/tags",
        json={"name": "ToDelete"},
        headers=auth_headers,
    )
    tag_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/admin/tags/{tag_id}", headers=auth_headers
    )
    assert response.status_code == 204

    # 删除后列表不应包含该标签
    list_resp = await client.get("/api/tags")
    names = {item["name"] for item in list_resp.json()}
    assert "ToDelete" not in names


@pytest.mark.asyncio
async def test_delete_tag_not_found(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """删除不存在的标签应返回 404。"""
    response = await client.delete(
        "/api/admin/tags/99999", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_tag_unauthorized(client: AsyncClient) -> None:
    """未认证删除标签应返回 401。"""
    response = await client.delete("/api/admin/tags/1")
    assert response.status_code == 401
