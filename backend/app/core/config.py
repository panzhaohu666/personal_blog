"""
核心配置模块

通过 pydantic-settings 从环境变量加载应用配置，包括：
- 数据库连接（PostgreSQL + asyncpg）
- Redis 连接
- JWT 认证密钥与过期时间
- CORS 允许域名
- Elasticsearch 连接
- 应用基础配置（debug、日志级别等）

所有敏感配置不得硬编码，必须从环境变量或 .env 文件读取。
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用全局配置，自动从环境变量和 .env 文件加载。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── 应用基础 ──────────────────────────────────────────────
    APP_NAME: str = "个人博客 API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # ── 项目路径 ──────────────────────────────────────────────
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent

    # ── 服务器 ────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── 数据库 (PostgreSQL + asyncpg) ─────────────────────────
    DATABASE_URL: SecretStr = SecretStr(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/personal_web"
    )

    # SQLite 兼容（测试/开发时可选）
    DATABASE_IS_SQLITE: bool = False

    @computed_field
    @property
    def SYNC_DATABASE_URL(self) -> str:
        """从 DATABASE_URL 推导同步版本，供 Alembic 使用。"""
        url = self.DATABASE_URL.get_secret_value()
        return url.replace("+asyncpg", "") if "+asyncpg" in url else url

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 10

    # ── JWT 认证 ──────────────────────────────────────────────
    SECRET_KEY: SecretStr = SecretStr("")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ──────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # ── Elasticsearch ─────────────────────────────────────────
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_INDEX_PREFIX: str = "personal_web"

    # ── 文件上传 ──────────────────────────────────────────────
    UPLOAD_DIR: Path = Path("uploads")
    MAX_UPLOAD_SIZE_MB: int = 10

    # ── RSS ───────────────────────────────────────────────────
    SITE_TITLE: str = "个人博客"
    SITE_DESCRIPTION: str = "一个个人技术博客"
    SITE_URL: str = "https://example.com"


@lru_cache
def get_settings() -> Settings:
    """获取单例配置实例（带缓存）。"""
    return Settings()
