#!/usr/bin/env bash
# ============================================================
# 个人博客 — 一键启动脚本
# ============================================================
set -euo pipefail
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

# 2. 启动 Docker 服务
echo -e "\n${YELLOW}🐳 启动 Docker 服务…${NC}"
docker compose -f docker/docker-compose.yml up -d
echo -e "${YELLOW}⏳ 等待服务就绪（首次需要拉取镜像，请耐心等待）…${NC}"
sleep 10

# 3. 数据库迁移
echo -e "\n${YELLOW}🗄️  执行数据库迁移…${NC}"
docker compose -f docker/docker-compose.yml exec -T backend uv run alembic upgrade head

# 4. 创建管理员（如果不存在）
echo -e "\n${YELLOW}👤 检查管理员账号…${NC}"
docker compose -f docker/docker-compose.yml exec -T backend uv run python -c "
import asyncio, uuid
from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.user import User
from app.core.security import hash_password

async def main():
    async with async_session_factory() as s:
        result = await s.execute(select(User).where(User.username == 'admin'))
        if result.scalar_one_or_none():
            print('✅ 管理员已存在')
        else:
            u = User(id=uuid.uuid4(), username='admin', email='admin@test.com',
                     hashed_password=hash_password('admin123'), is_active=True)
            s.add(u); await s.commit()
            print('✅ 管理员已创建: admin / admin123 (请登录后修改密码)')
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
echo -e "  登录账号:    admin / admin123"
echo -e ""
echo -e "  停止服务:    ${YELLOW}docker compose -f docker/docker-compose.yml down${NC}"
