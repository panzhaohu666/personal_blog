# 个人博客

基于 Django 构建的个人博客系统，自带美观的管理后台，无需依赖 Django Admin。

## 功能特性

### 博客前端（公开访问）
- 📝 文章列表展示，卡片式布局
- 📂 按分类筛选文章
- 🏷️ 标签展示
- 📱 响应式设计，手机/平板/桌面全适配

### 管理后台（需登录）
- ✏️ 创建/编辑/删除文章
- 📁 分类管理（增删）
- 🏷️ 标签管理（增删）
- 🔍 文章筛选搜索（按状态/分类/标题）
- 🔐 修改密码 / 修改邮箱
- 🎨 统一的暖色调设计语言

### 技术栈
- **后端**: Python 3.12 + Django 6.0
- **数据库**: SQLite
- **前端**: 原生 HTML/CSS（无框架依赖）
- **认证**: Django Auth

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/panzhaohu666/personal_blog.git
cd personal_blog

# 2. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量（复制 .env.example 为 .env 并修改）
cp .env.example .env

# 5. 数据库迁移
python manage.py migrate

# 6. 创建管理员账号
python manage.py createsuperuser

# 7. 启动服务
python manage.py runserver
```

打开 http://127.0.0.1:8000/ 登录后即可开始写文章。

博客前端地址: http://127.0.0.1:8000/blog/

## 项目结构

```
personal_web/
├── blog/                   # 博客应用
│   ├── models.py           # 数据模型（文章、分类、标签）
│   ├── views.py            # 视图函数（前端 + 后台）
│   ├── forms.py            # 表单定义
│   ├── urls.py             # 路由配置
│   └── admin.py            # 注册模型
├── personal_web/           # 项目配置
│   ├── settings.py
│   └── urls.py
├── templates/              # 模板文件
│   ├── blog/               # 博客前端模板
│   ├── manage/             # 管理后台模板
│   ├── login.html          # 登录页
│   └── home.html           # 工作台
├── manage.py
└── db.sqlite3
```

## 页面路由

| URL | 页面 | 权限 |
|-----|------|------|
| `/` | 登录页 | 公开 |
| `/home/` | 工作台 | 需登录 |
| `/blog/` | 博客首页 | 公开 |
| `/blog/post/<slug>/` | 文章详情 | 公开 |
| `/blog/category/<slug>/` | 分类筛选 | 公开 |
| `/blog/manage/posts/` | 文章管理 | 需登录 |
| `/blog/manage/categories/` | 分类管理 | 需登录 |
| `/blog/manage/tags/` | 标签管理 | 需登录 |
| `/blog/manage/system/` | 系统设置 | 需登录 |
| `/logout/` | 退出登录 | 需登录 |

## License

MIT
