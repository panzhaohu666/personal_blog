"""
安全模块

提供 JWT（JSON Web Token）的创建与验证，以及密码哈希功能。
- access_token: 短期访问令牌，携带用户信息
- refresh_token: 长期刷新令牌，用于换取新的 access_token
- 密码使用 bcrypt 算法哈希存储

用法：
    from app.core.security import create_access_token, verify_password

    hashed = hash_password("my-secret")
    assert verify_password("my-secret", hashed) is True

    token = create_access_token(data={"sub": "user@example.com"})
    payload = decode_access_token(token)
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

# ── 密码哈希 ──────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """对明文密码进行 bcrypt 哈希，返回哈希后的字符串。"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证明文密码是否与哈希值匹配。"""
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT ───────────────────────────────────────────────────────

SECRET_KEY = settings.SECRET_KEY.get_secret_value()
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """创建 JWT access_token。

    Args:
        data: 要编码到 token 中的数据（必须包含 'sub' 字段表示用户标识）。
        expires_delta: 自定义过期时间，默认为配置中的 ACCESS_TOKEN_EXPIRE_MINUTES。

    Returns:
        编码后的 JWT 字符串。
    """
    to_encode = data.copy()
    expire = datetime.now(UTC) + (
        expires_delta if expires_delta is not None
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """创建 JWT refresh_token，过期时间更长。

    Args:
        data: 要编码到 token 中的数据。
        expires_delta: 自定义过期时间，默认为配置中的 REFRESH_TOKEN_EXPIRE_DAYS。

    Returns:
        编码后的 JWT 字符串。
    """
    to_encode = data.copy()
    expire = datetime.now(UTC) + (
        expires_delta if expires_delta is not None
        else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """解码并验证 JWT access_token。

    Args:
        token: JWT 字符串。

    Returns:
        解码后的 payload 字典，验证失败返回 None。
    """
    try:
        payload: dict[str, Any] = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        return None
