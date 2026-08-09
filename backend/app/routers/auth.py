"""
认证 API 路由 —— JWT 登录、Token 刷新、用户信息、密码/邮箱修改。

端点：
- POST   /api/auth/login      用户登录
- POST   /api/auth/refresh    刷新令牌对
- GET    /api/auth/me         当前用户信息
- PUT    /api/auth/password   修改密码
- PUT    /api/auth/email      修改邮箱

依赖：
- get_current_user: 从 Authorization 头手动提取 Bearer token，
  验证后返回 User ORM 对象，供其他受保护路由复用。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.schemas.auth import (
    ChangeEmailRequest,
    ChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import LoginService

router = APIRouter()


# ── JWT 依赖（可复用）───────────────────────────────────────────

async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> User:
    """手动提取 Bearer token → 验证 JWT → 返回当前用户 ORM 对象。

    Raises:
        HTTPException(401): token 缺失、无效、过期、或用户不存在/已禁用。
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header[len("Bearer "):]

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌无效或已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的令牌类型",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的令牌载荷",
        )

    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已禁用",
        )

    return user


# ── 端点 ────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="用户登录",
)
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """验证用户名与密码，返回 JWT access_token 与 refresh_token。

    凭据错误返回 401。
    """
    user = await LoginService.authenticate(body.username, body.password, session)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    tokens = LoginService.create_tokens(user)
    return TokenResponse(**tokens)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="刷新令牌",
)
async def refresh(
    body: RefreshTokenRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """使用 refresh_token 换取新的令牌对。

    旧 refresh_token 立即失效（rotation）。
    """
    tokens = await LoginService.refresh_tokens(body.refresh_token, session)
    if tokens is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="刷新令牌无效或已过期",
        )
    return TokenResponse(**tokens)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="当前用户信息",
)
async def me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """获取当前登录用户的基本信息（需有效 JWT）。"""
    return UserResponse.model_validate(current_user)


@router.put(
    "/password",
    status_code=status.HTTP_200_OK,
    summary="修改密码",
)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """修改当前用户登录密码，需提供旧密码验证。

    新密码与确认密码必须一致。
    """
    if body.new_password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码与确认密码不一致",
        )

    try:
        await LoginService.change_password(
            current_user, body.old_password, body.new_password
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return {"message": "密码修改成功"}


@router.put(
    "/email",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="修改邮箱",
)
async def change_email(
    body: ChangeEmailRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> UserResponse:
    """修改当前用户邮箱地址，新邮箱不能已被其他用户使用。"""
    try:
        await LoginService.change_email(current_user, body.email, session)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return UserResponse.model_validate(current_user)
