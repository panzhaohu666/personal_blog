# 个人博客

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-✓-2496ED?logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

<p align="center"><b>全栈个人博客</b>：FastAPI + React + PostgreSQL + Redis + Docker<br>从 Django 单体应用重写为现代化前后端分离架构</p>

---

## 🏗️ 架构

```mermaid
graph TB
    subgraph 用户
        Browser["浏览器"]
    end

    subgraph Docker["🐳 Docker Compose"]
        N["Nginx :80"] --> Frontend["React SPA<br/>Vite + Tailwind + shadcn/ui"]
        N --> Backend["FastAPI :8000<br/>async SQLAlchemy 2.0"]
        Backend --> PG["PostgreSQL 16<br/>主数据库"]
        Backend --> R["Redis 7<br/>访问计数器 / Token 黑名单"]
    end

    subgraph Backend_内部["后端模块"]
        Auth["JWT 认证<br/>access + refresh 双 token 轮转"]
        CRUD["文章 CRUD<br/>Markdown 正文 / 分类 / 标签"]
        Search["全文搜索<br/>ILIKE + tsvector + GIN 索引"]
        Stats["访问统计<br/>Redis 原子自增 + VisitLog 表"]
        RSS["RSS 2.0<br/>最新 20 篇已发布文章"]
    end

    Browser --> N
    Auth --> CRUD
    CRUD --> Search
    CRUD --> Stats
    CRUD --> RSS
```

## ✨ 功能

### 📖 公开页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 文章列表 | `/blog` | 卡片式布局、分类侧边栏、分页、搜索 |
| 文章详情 | `/blog/post/:slug` | Markdown 渲染 + 代码高亮、访问计数 |
| 分类筛选 | `/blog/category/:slug` | 按分类过滤文章 |
| RSS 订阅 | `/blog/rss.xml` | RSS 2.0 标准 Feed |

### 🔧 管理后台

| 页面 | 路由 | 说明 |
|------|------|------|
| 仪表盘 | `/admin` | 总文章/已发布/访问量/分类标签统计卡片 |
| 文章管理 | `/admin/posts` | 表格列表、状态筛选、搜索、删除确认 |
| 文章编辑 | `/admin/posts/new` | Markdown 编辑、分类/标签选择、图片上传、草稿/发布切换 |
| 分类管理 | `/admin/categories` | 内联添加 + 表格 + 删除 |
| 标签管理 | `/admin/tags` | 内联添加 + 表格 + 删除 |
| 系统设置 | `/admin/system` | 显示当前邮箱 + 修改邮箱 + 修改密码 |

### 🎨 设计系统
- 暖色调（amber/cream）：主色 `#B9812F`、背景 `#F7F2E9`、卡片 `#FFFDF8`
- 暗色模式：🌙/☀️ 一键切换，localStorage 记忆，全页面适配
- 文章卡片缩略图：左侧图片 + 右侧摘要布局
- 衬线标题 + 无衬线正文，响应式适配移动端
- shadcn/ui 组件库 + Tailwind CSS 4 原子化样式
- 全站共用 SearchBar 组件，暗色模式自适应

## 🚀 快速开始

### 前置要求
- Docker >= 27 + Docker Compose >= 2.30
- （本地开发）Python 3.12 + Node.js 22

### 一键启动

```bash
./scripts/start.sh
```

自动完成：环境配置 → 启动容器 → 数据库迁移 → 创建管理员。

启动后访问：

| 地址 | 说明 |
|------|------|
| http://localhost:5173 | 博客首页 |
| http://localhost:5173/login | 管理后台 |
| http://localhost:8000/api/docs | Swagger API 文档 |
| http://localhost:8000/api/redoc | ReDoc API 文档 |

### 默认账号

| 用户名 | 密码 |
|--------|------|
| `admin` | `admin123` |

> ⚠️ 登录后请立即修改密码（管理后台 → 系统管理）

### 本地开发

```bash
# 后端（需要 PostgreSQL + Redis 运行中）
cd backend
cp .env.example .env      # 编辑数据库连接信息
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# 前端（新终端）
cd frontend
cp .env.example .env
npm install
npm run dev               # → http://localhost:5173
```

## 📁 项目结构

```
personal_web/
├── backend/                          # FastAPI 后端（Python 3.12）
│   ├── app/
│   │   ├── main.py                   # 应用入口 + lifespan + CORS
│   │   ├── core/                     # 配置 / 数据库 / JWT / Redis / 依赖注入
│   │   ├── models/                   # SQLAlchemy 2.0 异步模型（6 张表）
│   │   │   ├── user.py               #   用户（UUID 主键）
│   │   │   ├── post.py               #   文章 + PostTag 关联表
│   │   │   ├── category.py           #   分类（自增主键）
│   │   │   ├── tag.py                #   标签（自增主键）
│   │   │   └── visit.py              #   访问日志
│   │   ├── schemas/                  # Pydantic 请求/响应校验
│   │   ├── routers/                  # 7 个路由模块（17 个端点）
│   │   ├── services/                 # 认证 + 文章业务逻辑
│   │   └── search/                   # 搜索抽象层（ILIKE / tsvector）
│   ├── migrations/                   # Alembic 数据库迁移
│   └── tests/                        # pytest 异步集成测试
├── frontend/                         # React 前端（TypeScript 6）
│   ├── src/
│   │   ├── pages/                    # 11 个页面组件
│   │   │   ├── BlogList.tsx          #   文章列表
│   │   │   ├── BlogPost.tsx          #   文章详情
│   │   │   ├── Login.tsx             #   登录页
│   │   │   └── admin/                #   管理后台（7 个页面）
│   │   ├── components/               # 共享组件（ThemeToggle, SearchBar, shadcn/ui）
│   │   ├── hooks/                    # TanStack Query v5 数据 hooks
│   │   └── api/                      # axios 客户端（JWT 拦截器）
│   └── e2e/                          # Playwright E2E 测试
├── docker/                           # Docker Compose（dev + prod）+ Nginx
├── scripts/
│   ├── start.sh                      # 一键启动脚本
│   ├── migrate_data.py               # Django SQLite → PostgreSQL 迁移
│   └── benchmark_search.py           # 搜索引擎基准测试
└── .github/workflows/                # GitHub Actions CI/CD
```

## 📡 API 概览

### 认证
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| `POST` | `/api/auth/login` | - | 登录，返回 JWT |
| `POST` | `/api/auth/refresh` | - | 刷新 Token（旧 token 即失效） |
| `GET` | `/api/auth/me` | JWT | 当前用户信息 |
| `PUT` | `/api/auth/password` | JWT | 修改密码 |
| `PUT` | `/api/auth/email` | JWT | 修改邮箱 |

### 文章
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| `GET` | `/api/posts` | - | 文章列表（分页、筛选、搜索） |
| `GET` | `/api/posts/search` | - | 全文搜索（支持切换引擎） |
| `GET` | `/api/posts/{slug}` | - | 文章详情（自动计数） |
| `POST` | `/api/admin/posts` | JWT | 创建文章 |
| `PUT` | `/api/admin/posts/{id}` | JWT | 编辑文章 |
| `DELETE` | `/api/admin/posts/{id}` | JWT | 删除文章 |
| `GET` | `/api/admin/posts` | JWT | 管理列表（含草稿） |

### 分类 & 标签 & 统计 & 上传
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| `GET` | `/api/categories` | - | 分类列表（含文章数） |
| `POST` | `/api/admin/categories` | JWT | 创建分类 |
| `DELETE` | `/api/admin/categories/{id}` | JWT | 删除分类 |
| `GET` | `/api/tags` | - | 标签列表 |
| `POST` | `/api/admin/tags` | JWT | 创建标签 |
| `DELETE` | `/api/admin/tags/{id}` | JWT | 删除标签 |
| `GET` | `/api/stats/overview` | - | 站点统计概览 |
| `GET` | `/api/stats/posts/{id}` | - | 单篇访问统计 |
| `POST` | `/api/admin/upload` | JWT | 图片上传 |

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql+asyncpg://blog:blog_dev_password@localhost:5432/blog` |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT 签名密钥 | 随机生成 |
| `CORS_ORIGINS` | 允许的跨域来源 | `http://localhost:5173` |
| `VITE_API_BASE_URL` | 前端 API 地址 | `http://localhost:8000` |

## 🔍 深度亮点

### 全文搜索方案对比

实现 3 种搜索引擎，以统一接口切换：

| 引擎 | 原理 | 索引 | 适用场景 |
|------|------|------|----------|
| `ILIKE` | PostgreSQL `column ILIKE '%keyword%'` | 无 | 小数据量、模糊匹配 |
| `tsvector` | `to_tsvector + plainto_tsquery + @@` | GIN 索引 | 中文全文检索、生产推荐 |

基准测试：
```bash
cd backend && uv run python ../scripts/benchmark_search.py --posts 500 --queries 50
```

输出对比报告：QPS / P50 / P95 / P99 延迟 / 准确率。

### 集成测试 + E2E

```bash
# API 集成测试（pytest，异步覆盖全部端点）
cd backend && uv run pytest -v

# E2E 测试（Playwright，模拟登录→写文章→发布→搜索→阅读）
cd frontend && npx playwright test
```

## 🐳 部署

```bash
# 生产环境
cp .env.example .env && vim .env    # 修改 SECRET_KEY 等
docker compose -f docker/docker-compose.prod.yml up -d
```

生产配置特点：
- Nginx 反向代理 + Gzip + SPA fallback
- Redis 持久化（AOF）+ 内存限制 64MB
- 多阶段 Docker 构建，镜像体积优化
- GitHub Actions CI：lint → type-check → test → build

## 📄 License

MIT © 2026
