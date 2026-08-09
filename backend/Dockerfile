# ── Dockerfile ──────────────────────────────────────────────────────

# ── 阶段 1: 开发模式（热重载）──────────────────────────────────
FROM python:3.12-slim AS dev

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libc6-dev libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock README.md ./
RUN uv sync

COPY . .

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── 阶段 2: 生产依赖安装 ───────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# 安装系统构建依赖（psycopg2/asyncpg 需要）
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libc6-dev \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖到独立目录
COPY pyproject.toml .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --target=/install \
        fastapi[standard] \
        uvicorn[standard] \
        sqlalchemy[asyncio] \
        asyncpg \
        alembic \
        redis[hiredis] \
        python-jose[cryptography] \
        passlib[bcrypt] \
        python-multipart \
        aiofiles \
        httpx \
        feedgen \
        elasticsearch[async] \
        python-dotenv \
        pydantic-settings \
        aiosmtplib

# ── 阶段 2: 生产运行 ────────────────────────────────────────────
FROM python:3.12-slim AS runner

# 安装运行时系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r appuser \
    && useradd -r -g appuser -d /app appuser

WORKDIR /app

# 从 builder 复制已安装的依赖
COPY --from=builder /install /usr/local/lib/python3.12/site-packages

# 复制应用代码
COPY alembic.ini .
COPY app/ ./app/
COPY migrations/ ./migrations/

# 设置权限
RUN chown -R appuser:appuser /app

USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# 运行应用
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
