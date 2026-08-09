"""
认证服务 —— 用户验证与 JWT Token 管理。

提供 LoginService 类，封装登录验证、Token 签发/刷新、以及账户管理
（密码/邮箱修改）的业务逻辑。Token 刷新使用 jti + Redis 黑名单实现
refresh token rotation。
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.redis import cache_exists, cache_set
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User

settings = get_settings()


class LoginService:
    """认证业务逻辑服务。

    所有方法均为静态异步方法，从数据库会话和请求参数中
    完成验证与数据持久化。
    """

    @staticmethod
    async def authenticate(
        username: str,
        password: str,
        session: AsyncSession,
    ) -> User | None:
        """验证用户名与密码，返回 User ORM 对象，失败返回 None。

        同时检查用户 is_active 状态，已禁用的用户无法登录。
        """
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()
        if user is None or not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user

    @staticmethod
    def create_tokens(user: User) -> dict:
        """为用户创建 access_token 和 refresh_token。

        每个令牌对共享一个 jti（JWT ID），用于 refresh token rotation
        的追踪与黑名单机制。

        Returns:
            dict: 包含 access_token, refresh_token, token_type 的字典，
                  可直接解包给 TokenResponse schema。
        """
        jti = str(uuid.uuid4())
        token_data = {"sub": str(user.id), "username": user.username}
        access_token = create_access_token(
            {**token_data, "jti": jti, "type": "access"}
        )
        refresh_token = create_refresh_token(
            {**token_data, "jti": jti, "type": "refresh"}
        )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }

    @staticmethod
    async def refresh_tokens(
        refresh_token: str,
        session: AsyncSession,
    ) -> dict | None:
        """验证 refresh token 并颁发新令牌对（rotation）。

        流程：
        1. 解码并验证 refresh token
        2. 检查 token type 是否为 "refresh"
        3. 检查 jti 是否在 Redis 黑名单中（已使用过的 token 拒绝）
        4. 将当前 jti 加入 Redis 黑名单（TTL = 剩余有效期）
        5. 从数据库重新加载用户（确保仍激活）
        6. 签发新令牌对

        Returns:
            新的 token 字典，验证失败返回 None。
        """
        payload = decode_access_token(refresh_token)
        if payload is None:
            return None
        if payload.get("type") != "refresh":
            return None

        # Refresh token rotation: 旧 jti 加入黑名单
        jti = payload.get("jti")
        if jti:
            key = f"rt_blacklist:{jti}"
            if await cache_exists(key):
                return None
            exp = payload.get("exp", 0)
            now_ts = datetime.now(UTC).timestamp()
            ttl = max(0, int(exp - now_ts))
            await cache_set(key, "1", expire=ttl)

        # 重新加载用户以确保仍处于激活状态
        user_id = payload.get("sub")
        if user_id is None:
            return None

        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            return None

        return LoginService.create_tokens(user)

    @staticmethod
    async def change_password(
        user: User,
        old_password: str,
        new_password: str,
    ) -> None:
        """修改密码：先验证旧密码，再将新密码 bcrypt 哈希后写入。

        Raises:
            ValueError: 旧密码不正确。
        """
        if not verify_password(old_password, user.hashed_password):
            raise ValueError("旧密码不正确")
        user.hashed_password = hash_password(new_password)

    @staticmethod
    async def change_email(
        user: User,
        email: str,
        session: AsyncSession,
    ) -> None:
        """修改邮箱：检查唯一性后更新用户邮箱。

        Raises:
            ValueError: 邮箱已被其他用户占用。
        """
        result = await session.execute(
            select(User).where(User.email == email, User.id != user.id)
        )
        if result.scalar_one_or_none() is not None:
            raise ValueError("该邮箱已被使用")
        user.email = email
