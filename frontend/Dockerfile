# ==============================================================
# 开发模式 —— 支持热更新（Hot Module Replacement）
# 用法：
#   docker build -t blog-frontend:dev --target dev .
#   docker run -p 5173:5173 -v $(pwd)/src:/app/src blog-frontend:dev
# ==============================================================
FROM node:24-alpine AS dev

WORKDIR /app

# 复制依赖文件并安装
COPY package.json package-lock.json ./
RUN npm ci

# 复制源代码
COPY . .

# 暴露 Vite 开发服务器端口
EXPOSE 5173

# 启动 Vite 开发服务器（热更新）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ==============================================================
# 生产构建阶段
# 编译 TypeScript + 打包前端资源
# ==============================================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 生产构建（TypeScript 检查 + Vite 打包）
RUN npm run build

# ==============================================================
# 生产运行阶段 —— 使用 Nginx 提供静态文件服务
# 用法：
#   docker build -t blog-frontend:prod --target prod .
#   docker run -p 8080:80 blog-frontend:prod
# ==============================================================
FROM nginx:1.27-alpine AS prod

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制打包好的静态文件
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
