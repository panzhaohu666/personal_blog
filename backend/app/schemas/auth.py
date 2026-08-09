"""认证相关的 Pydantic 数据模型。

定义登录请求/响应、JWT token 载荷、用户信息等 schema。
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_serializer


class LoginRequest(BaseModel):
    """登录请求"""
    username: str = Field(..., min_length=1, max_length=150, description="用户名")
    password: str = Field(..., min_length=6, description="密码")


class TokenResponse(BaseModel):
    """JWT Token 响应"""
    access_token: str = Field(..., description="访问令牌（Bearer）")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")


class RefreshTokenRequest(BaseModel):
    """刷新 Token 请求"""
    refresh_token: str = Field(..., description="刷新令牌")


class UserResponse(BaseModel):
    """用户信息响应"""
    id: str = Field(..., description="用户 ID（UUID）")
    username: str = Field(..., description="用户名")
    email: str | None = Field(default=None, description="邮箱")
    is_active: bool = Field(default=True, description="是否激活")
    created_at: str = Field(..., description="注册时间")

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6, description="新密码，最少 6 位")
    confirm_password: str = Field(..., min_length=6, description="确认新密码")


class ChangeEmailRequest(BaseModel):
    """修改邮箱请求"""
    email: EmailStr = Field(..., description="新邮箱地址")
