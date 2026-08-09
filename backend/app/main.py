"""
FastAPI 应用入口

创建并配置 FastAPI 应用，包括：
- 应用生命周期管理（startup/shutdown）
- CORS 中间件配置
- 路由注册
- 健康检查端点

启动方式：
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.database import close_db, engine
from app.core.redis import close_redis

logger = logging.getLogger(__name__)
settings = get_settings()


# ── 生命周期 ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理：启动时初始化资源，关闭时释放资源。"""
    logger.info(
        f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} 启动中..."
    )

    # 安全检查：SECRET_KEY 必须已设置
    if not settings.SECRET_KEY.get_secret_value():
        logger.critical("❌ SECRET_KEY 未设置！请在 .env 中配置 SECRET_KEY 后重试")
        raise RuntimeError("SECRET_KEY is not set")

    # 验证数据库连接
    try:
        async with engine.connect() as conn:
            await conn.execute(
                __import__("sqlalchemy").text("SELECT 1")
            )
        logger.info("✓ 数据库连接正常")
    except Exception as e:
        logger.critical(f"❌ 数据库连接失败: {e}")
        raise

    yield

    # 关闭资源
    await close_db()
    await close_redis()
    logger.info("👋 应用已关闭，所有资源已释放")


# ── 应用实例 ──────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="个人博客后端 API 服务",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS 中间件 ───────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 健康检查 ──────────────────────────────────────────────────

@app.get("/api/health", tags=["系统"])
async def health_check() -> JSONResponse:
    """健康检查端点，返回服务状态。"""
    return JSONResponse(content={"status": "ok"})


# ── 静态文件 ──────────────────────────────────────────────────

app.mount("/uploads", StaticFiles(directory="uploads/uploads"), name="uploads")


# ── 路由注册 ────────────────────────────────────────────────

from app.routers import auth, categories, rss, stats, tags, upload
from app.routers.posts import admin_post_router, post_router

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(post_router)
app.include_router(admin_post_router)
app.include_router(categories.router)
app.include_router(tags.router)
app.include_router(rss.router)
app.include_router(stats.router)
app.include_router(upload.router)
