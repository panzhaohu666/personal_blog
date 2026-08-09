"""
分类接口集成测试

测试端点：
- GET    /api/categories              公开列表
- POST   /api/admin/categories        创建分类（需认证）
- DELETE /api/admin/categories/{id}   删除分类（需认证）
- 唯一性约束：同名分类创建返回 409
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# ── GET /api/categories ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_categories_empty(client: AsyncClient) -> None:
    """无分类时应返回空数组。"""
    response = await client.get("/api/categories")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_categories_with_data(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """创建分类后列表应返回分类数据。"""
    await client.post(
        "/api/admin/categories",
        json={"name": "Python"},
        headers=auth_headers,
    )
    await client.post(
        "/api/admin/categories",
        json={"name": "JavaScript"},
        headers=auth_headers,
    )

    response = await client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {item["name"] for item in data}
    assert names == {"Python", "JavaScript"}


# ── POST /api/admin/categories ─────────────────────────────────

@pytest.mark.asyncio
async def test_create_category(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """创建分类应返回 201 并包含正确字段。"""
    response = await client.post(
        "/api/admin/categories",
        json={"name": "DevOps"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "DevOps"
    assert "id" in data
    assert "slug" in data
    assert data["post_count"] == 0


@pytest.mark.asyncio
async def test_create_category_duplicate(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """创建同名分类应返回 409 Conflict。"""
    await client.post(
        "/api/admin/categories",
        json={"name": "UniqueCat"},
        headers=auth_headers,
    )

    response = await client.post(
        "/api/admin/categories",
        json={"name": "UniqueCat"},
        headers=auth_headers,
    )
    assert response.status_code == 409
    assert "已存在" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_category_unauthorized(client: AsyncClient) -> None:
    """未认证创建分类应返回 401。"""
    response = await client.post(
        "/api/admin/categories",
        json={"name": "Unauthorized"},
    )
    assert response.status_code == 401


# ── DELETE /api/admin/categories/{id} ──────────────────────────

@pytest.mark.asyncio
async def test_delete_category(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """删除存在的分类应返回 204。"""
    create_resp = await client.post(
        "/api/admin/categories",
        json={"name": "ToDelete"},
        headers=auth_headers,
    )
    cat_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/admin/categories/{cat_id}", headers=auth_headers
    )
    assert response.status_code == 204

    # 删除后列表不应包含该分类
    list_resp = await client.get("/api/categories")
    names = {item["name"] for item in list_resp.json()}
    assert "ToDelete" not in names


@pytest.mark.asyncio
async def test_delete_category_not_found(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    """删除不存在的分类应返回 404。"""
    response = await client.delete(
        "/api/admin/categories/99999", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_category_unauthorized(client: AsyncClient) -> None:
    """未认证删除分类应返回 401。"""
    response = await client.delete("/api/admin/categories/1")
    assert response.status_code == 401
