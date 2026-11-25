#!/usr/bin/env bash
# ============================================================
# 个人博客 — 一键启动脚本
# ============================================================
set -euo pipefail
ADMIN_USERNAME="${ADMIN_USERNAME:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  个人博客 — 一键启动${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. 环境变量
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 未找到 .env，从 .env.example 复制…${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env 已创建，默认配置可直接使用${NC}"
fi

if [ -z "$ADMIN_USERNAME" ]; then
    ADMIN_USERNAME="$(sed -n 's/^ADMIN_USERNAME=//p' .env | tail -n 1)"
fi
if [ -z "$ADMIN_EMAIL" ]; then
    ADMIN_EMAIL="$(sed -n 's/^ADMIN_EMAIL=//p' .env | tail -n 1)"
fi
if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD="$(sed -n 's/^ADMIN_PASSWORD=//p' .env | tail -n 1)"
fi
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"

# 2. 启动 Docker 服务
echo -e "\n${YELLOW}🐳 启动 Docker 服务…${NC}"
docker compose -f docker/docker-compose.yml up -d
echo -e "${YELLOW}⏳ 等待服务就绪（首次需要拉取镜像，请耐心等待）…${NC}"
sleep 10

if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD="$(docker compose -f docker/docker-compose.yml exec -T backend uv run python -c 'import secrets; print(secrets.token_urlsafe(24))' | tr -d '\r\n')"
fi
if [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
    echo "ADMIN_PASSWORD 至少需要 12 个字符" >&2
    exit 1
fi

# 3. 数据库迁移
echo -e "\n${YELLOW}🗄️  执行数据库迁移…${NC}"
docker compose -f docker/docker-compose.yml exec -T backend uv run alembic upgrade head

# 4. 创建管理员（如果不存在）
echo -e "\n${YELLOW}👤 检查管理员账号…${NC}"
docker compose -f docker/docker-compose.yml exec -T \
    -e "ADMIN_USERNAME=$ADMIN_USERNAME" \
    -e "ADMIN_EMAIL=$ADMIN_EMAIL" \
    -e "ADMIN_PASSWORD=$ADMIN_PASSWORD" \
    backend uv run python -c "
import asyncio, os, uuid
from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.user import User
from app.core.security import hash_password

async def main():
    username = os.environ['ADMIN_USERNAME']
    email = os.environ['ADMIN_EMAIL']
    password = os.environ['ADMIN_PASSWORD']
    if len(password) < 12:
        raise SystemExit('ADMIN_PASSWORD must contain at least 12 characters')
    async with async_session_factory() as s:
        result = await s.execute(select(User).where(User.username == username))
        if result.scalar_one_or_none():
            print('✅ 管理员已存在')
        else:
            u = User(id=uuid.uuid4(), username=username, email=email,
                     hashed_password=hash_password(password), is_active=True)
            s.add(u); await s.commit()
            print(f'✅ 管理员已创建: {username} / {password} (请妥善保存)')
asyncio.run(main())
"

# 5. 完成
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  🎉 启动成功！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "  博客前端:    ${YELLOW}http://localhost:5173${NC}"
echo -e "  管理后台:    ${YELLOW}http://localhost:5173/login${NC}"
echo -e "  API 文档:    ${YELLOW}http://localhost:8000/api/docs${NC}"
echo -e "  RSS 订阅:    ${YELLOW}http://localhost:8000/blog/rss.xml${NC}"
echo -e ""
echo -e "  管理员用户名: ${YELLOW}${ADMIN_USERNAME}${NC}"
echo -e "  管理员密码:   由 ADMIN_PASSWORD 提供；首次自动生成时会显示一次"
echo -e ""
echo -e "  停止服务:    ${YELLOW}docker compose -f docker/docker-compose.yml down${NC}"
