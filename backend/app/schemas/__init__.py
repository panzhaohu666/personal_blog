"""Pydantic schemas 包。

所有 API 的请求/响应数据模型集中在这里。
"""
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
    ChangePasswordRequest,
    ChangeEmailRequest,
)
from app.schemas.post import (
    CategoryResponse,
    CategoryCreate,
    TagResponse,
    TagCreate,
    PostCreate,
    PostUpdate,
    PostSummary,
    PostDetail,
    PostListResponse,
    SearchResult,
    UploadResponse,
)
from app.schemas.stats import (
    StatsOverview,
    PostStats,
    DailyStats,
)

__all__ = [
    # Auth
    "LoginRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "UserResponse",
    "ChangePasswordRequest",
    "ChangeEmailRequest",
    # Posts
    "CategoryResponse",
    "CategoryCreate",
    "TagResponse",
    "TagCreate",
    "PostCreate",
    "PostUpdate",
    "PostSummary",
    "PostDetail",
    "PostListResponse",
    "SearchResult",
    "UploadResponse",
    # Stats
    "StatsOverview",
    "PostStats",
    "DailyStats",
]
