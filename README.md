# AWSL Video

基于 React + Vite 和 FastAPI 的视频网站平台，支持视频分集播放和管理员后台管理。

## 功能特性

### 用户功能
- 视频列表浏览（分页、分区筛选、搜索）
- 视频详情查看
- 支持分集播放
- 视频流式播放，支持拖动进度条
- 响应式设计，支持移动端

### 管理员功能
- JWT 身份验证
- 视频信息管理（增删改查）
- 封面图片上传（最大 2MB）
- 视频上传（自动分片为 10MB 存储到 Telegram）
- 分集管理
- 分区管理

## 技术栈

### 后端
- **FastAPI** - 现代 Python Web 框架
- **SQLAlchemy** - ORM 数据库操作
- **PostgreSQL** - 生产数据库（支持 Neon、Supabase 等）
- **SQLite** - 本地开发数据库
- **asyncpg** - PostgreSQL 异步驱动
- **JWT** - 身份验证
- **AWSL Telegram Storage** - 视频文件存储

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **React Router** - 路由管理
- **shadcn/ui** - UI 组件库
- **Tailwind CSS v4** - 样式框架
- **Axios** - HTTP 客户端

## 项目结构

```
awsl-video/
├── main.py                  # Vercel 入口点
├── requirements.txt         # Python 依赖（根目录）
├── vercel.json             # Vercel 部署配置
├── .vercelignore           # Vercel 忽略文件
│
├── backend/                # 后端代码
│   ├── app/
│   │   ├── routes/        # API 路由
│   │   │   ├── admin.py   # 管理员 API (/admin-api/*)
│   │   │   ├── user.py    # 用户 API (/api/*)
│   │   │   └── auth.py    # 认证 API (/admin-api/auth/*)
│   │   ├── models.py      # 数据库模型
│   │   ├── schemas.py     # Pydantic 模型
│   │   ├── database.py    # 数据库配置
│   │   ├── auth.py        # JWT 认证
│   │   ├── storage.py     # Telegram 存储客户端
│   │   ├── config.py      # 配置
│   │   └── main.py        # FastAPI 应用
│   ├── requirements.txt   # Python 依赖（备份）
│   └── .env.example       # 环境变量示例
│
└── frontend/              # 前端代码
    ├── src/
    │   ├── pages/         # 页面组件
    │   │   ├── HomePage.tsx        # 首页
    │   │   ├── VideoPlayerPage.tsx # 播放页
    │   │   ├── LoginPage.tsx       # 登录页
    │   │   └── AdminPage.tsx       # 管理页
    │   ├── components/    # UI 组件
    │   │   └── ui/       # shadcn/ui 组件
    │   ├── api.ts         # API 客户端
    │   ├── App.tsx        # 主应用
    │   └── main.tsx       # 入口文件
    ├── package.json
    └── vite.config.ts
```

## 快速开始

### 前置要求

- Python 3.9+
- Node.js 18+
- pnpm（推荐）或 npm
- AWSL Telegram Storage 服务
- PostgreSQL 数据库（生产环境）或 SQLite（本地开发）

### 后端设置

1. 进入后端目录：
```bash
cd backend
```

2. 创建并激活虚拟环境：

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，填入实际配置
```

**环境变量说明：**
- `SECRET_KEY`: JWT 密钥（建议使用随机字符串）
- `ADMIN_USERNAME`: 管理员用户名
- `ADMIN_PASSWORD`: 管理员密码
- `AWSL_TELEGRAM_STORAGE_URL`: Telegram 存储服务地址（例如：https://assets.awsl.icu）
- `AWSL_TELEGRAM_API_TOKEN`: Telegram 存储 API Token
- `AWSL_TELEGRAM_CHAT_ID`: Telegram Chat ID
- `DATABASE_URL`: 数据库连接字符串
  - **SQLite（本地开发）**: `sqlite+aiosqlite:///./videos.db`
  - **PostgreSQL（生产环境）**: `postgresql+asyncpg://user:password@host:5432/dbname?ssl=require`

5. 运行后端：
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端将在 http://localhost:8000 运行
API 文档：http://localhost:8000/docs

**注意**：每次打开新终端运行后端时，需要先激活虚拟环境。

### 前端设置

1. 进入前端目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
pnpm install
# 或
npm install
```

3. 配置环境变量：
```bash
# 创建 .env 文件，配置后端 API 地址
VITE_API_BASE_URL=http://localhost:8000
```

4. 运行前端：
```bash
pnpm dev
# 或
npm run dev
```

前端将在 http://localhost:5173 运行

## 部署到 Vercel

### 前置准备

1. **PostgreSQL 数据库**：
   - 推荐使用 [Neon](https://neon.tech)、[Supabase](https://supabase.com) 或 [Railway](https://railway.app)
   - 获取数据库连接字符串

2. **Telegram Storage**：
   - 确保有可用的 Telegram 存储服务

### 部署步骤

1. 将代码推送到 GitHub 仓库

2. 在 [Vercel](https://vercel.com) 导入项目

3. 配置环境变量（在 Vercel 项目设置中）：
   ```
   SECRET_KEY=your-secret-key
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-password
   AWSL_TELEGRAM_STORAGE_URL=https://assets.awsl.icu
   AWSL_TELEGRAM_API_TOKEN=your-token
   AWSL_TELEGRAM_CHAT_ID=your-chat-id
   DATABASE_URL=postgresql+asyncpg://user:password@host/db?ssl=require
   ```

4. 部署！Vercel 会自动：
   - 构建前端（React + Vite）
   - 部署后端（Python FastAPI）
   - 配置路由

## API 接口

### 认证接口
- `POST /admin-api/auth/login` - 管理员登录

### 用户接口
- `GET /api/categories` - 获取分区列表
- `GET /api/videos` - 获取视频列表（分页、筛选、搜索）
- `GET /api/videos/{video_id}` - 获取视频详情
- `GET /api/episodes/{episode_id}` - 获取分集信息
- `GET /api/stream/{episode_id}` - 流式播放视频
- `GET /api/cover/{file_id}` - 获取封面图片

### 管理员接口（需要 JWT 认证）
- `POST /admin-api/videos` - 创建视频
- `GET /admin-api/videos/{video_id}` - 获取视频详情
- `PUT /admin-api/videos/{video_id}` - 更新视频信息
- `POST /admin-api/videos/{video_id}/cover` - 上传封面图片（最大 2MB）
- `DELETE /admin-api/videos/{video_id}` - 删除视频
- `POST /admin-api/videos/{video_id}/episodes` - 创建分集
- `PUT /admin-api/episodes/{episode_id}` - 更新分集信息
- `POST /admin-api/episodes/{episode_id}/upload` - 上传视频文件
- `DELETE /admin-api/episodes/{episode_id}` - 删除分集

## 视频存储说明

视频文件会被自动分片为 10MB 的块，存储到 AWSL Telegram Storage 服务中。播放时会自动从 Telegram 下载并合并分片，支持 Range 请求以实现拖动进度条。

## 数据库模型

### Video（视频）
- id: 主键
- title: 标题
- description: 描述
- cover_url: 封面图 URL
- category: 分区（影视、动漫、音乐、舞蹈、游戏、知识、科技、美食、其他）
- created_at: 创建时间
- updated_at: 更新时间

### Episode（分集）
- id: 主键
- video_id: 所属视频 ID
- episode_number: 集数
- title: 标题
- duration: 时长（秒）
- created_at: 创建时间

### VideoChunk（视频分片）
- id: 主键
- episode_id: 所属分集 ID
- chunk_index: 分片索引
- file_id: Telegram file_id
- chunk_size: 分片大小（字节）

## 开发说明

### 后端开发
- 使用 FastAPI 的自动 API 文档进行调试：http://localhost:8000/docs
- 数据库会在首次启动时自动创建表
- SQLite 用于本地开发，PostgreSQL 用于生产环境

### 前端开发
- 使用 TypeScript 进行类型检查
- 使用 shadcn/ui 组件库保持 UI 一致性
- 使用 Tailwind CSS v4 进行样式管理
- API 调用统一在 `src/api.ts` 中管理

### 数据库迁移

如需从 SQLite 迁移到 PostgreSQL：

1. 确保目标 PostgreSQL 数据库已创建
2. 修改 `.env` 中的 `DATABASE_URL` 为 PostgreSQL 连接字符串
3. 重启应用，数据库表会自动创建
4. 如有现有数据，需手动迁移

## 技术特性

- ✅ 异步数据库操作（asyncpg）
- ✅ 视频流式传输，支持 Range 请求
- ✅ JWT 认证保护管理员接口
- ✅ 自动视频分片存储
- ✅ 响应式设计，移动端友好
- ✅ 支持 Vercel 无服务器部署
- ✅ PostgreSQL 数据库支持
- ✅ 现代化 UI（shadcn/ui + Tailwind CSS v4）

## 许可证

MIT License
