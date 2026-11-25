"""Pydantic schemas 包。

所有 API 的请求/响应数据模型集中在这里。
"""

from app.schemas.auth import (
    ChangeEmailRequest,
    ChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.post import (
    CategoryCreate,
    CategoryResponse,
    PostCreate,
    PostDetail,
    PostListResponse,
    PostSummary,
    PostUpdate,
    SearchResult,
    TagCreate,
    TagResponse,
    UploadResponse,
)
from app.schemas.stats import (
    DailyStats,
    PostStats,
    StatsOverview,
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
