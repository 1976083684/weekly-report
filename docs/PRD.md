# AI随记 — 产品需求文档 (PRD)

> 版本：1.1
> 日期：2026-05-07
> 技术方案：Next.js 16 (Turbopack) + Auth.js v5 + Prisma + SQLite

---

## 1. 产品概述

### 1.1 产品定位

面向个人用户的日记与周报管理工具，支持 Markdown 编写、标签分类、Gitee 风格活跃度热力图、自动周报生成，数据可备份至 GitHub / Gitee 仓库。Web 端与移动端自适应响应式布局。

### 1.2 目标用户

个人开发者 / 知识工作者，需要：
- 日常记录工作日志和个人日记
- 按周汇总生成周报
- 通过可视化热力图追踪记录习惯
- 数据自主可控，可备份到自有 Git 仓库
- 随时随地通过手机或电脑访问

### 1.3 核心价值

- **简洁专注**：只做日记和周报，不做大而全
- **可视化追踪**：Gitee 风格年度活跃度热力图，直观展示记录频率
- **数据自主**：SQLite 本地存储 + Git 仓库备份，数据始终在自己手中
- **随时访问**：响应式设计，桌面和手机体验一致

---

## 2. 功能需求

### 2.1 仪表盘

#### 2.1.1 统计概览

- 四张统计卡片：总日记数、本周记录、周报数、标签数
- 数据实时从数据库聚合查询

#### 2.1.2 年度活跃度热力图（Gitee 风格）

- 按年展示日记贡献活跃度，每年 52-53 周列 x 7 天行
- 颜色等级：无色（0篇）、浅绿（1篇）、中绿（2篇）、深绿（3-4篇）、墨绿（5篇以上）
- 鼠标悬停显示：`N篇贡献度：YYYY-MM-DD`
- 年份下拉选择器（最近 5 年）
- 月度标签行显示在热力图上方
- 图例：少 → 多
- 移动端支持横向滑动（`overflow-x-auto touch-pan-x`）
- 百分比自适应格子大小，最小宽度 600px

#### 2.1.3 月度分布

- 横向柱状图展示每月日记数量
- 移动端横向滑动，最小宽度 400px
- 柱状高度自适应，悬停显示详情

#### 2.1.4 本周活跃度

- 本周 7 天柱状图，当天高亮
- 显示每天日记数量标签
- 底部显示本周起止日期

#### 2.1.5 最近动态

- 展示最新日记列表（标题 + 日期 + 标签）
- 点击跳转日记编辑页
- "查看全部"链接跳转日记列表

#### 2.1.6 右侧面板

- **快速记录**：快速入口 - 写日记 / 写周报
- **本周总结**：条目数量、活跃天数、热门标签
- **活跃度说明**：解释贡献日记、日报、周报含义

### 2.2 用户认证

#### 2.2.1 账号密码注册 / 登录

- 注册：邮箱 + 密码，密码最少 8 位，需包含字母和数字
- 登录：邮箱 + 密码
- bcrypt 密码哈希存储
- Session 策略：JWT Token（Auth.js v5）
- 支持修改密码

#### 2.2.2 第三方 OAuth 登录

- **GitHub 登录**：Auth.js 内置 GitHub Provider
- **Gitee 登录**：自定义 OAuth Provider（Gitee OAuth API v5）
- 首次 OAuth 登录自动创建账号，关联第三方账号

### 2.3 日记管理

#### 2.3.1 日记编写

- Markdown 编辑器，支持实时预览（@uiw/react-md-editor）
- 每篇日记包含：
  - 标题（必填）
  - 正文（Markdown，必填）
  - 日期（默认当天，可修改）
  - 标签（可选，多标签）
  - 心情标记（可选：开心 / 平静 / 一般 / 低落 / 难过，可为空）
  - 创建时间 / 更新时间（自动）

#### 2.3.2 日记列表与搜索

- 按置顶优先 + 日期倒序展示
- 支持按标签筛选
- 支持按日期范围筛选
- 全文搜索（标题 + 正文内容）
- 分页展示，默认每页 10 条，可选 10/20/30/40/50/100
- 分页栏始终可见
- 每页条数切换下拉框

#### 2.3.3 日记操作

- 新建、编辑、删除日记
- 删除需二次确认（AlertDialog）
- 支持日记置顶 / 取消置顶

### 2.4 周报管理

#### 2.4.1 周报生成

- 选择日期范围（默认当周 周一至周日）
- 自动聚合该日期范围内的日记，生成周报草稿
- 周报结构模板：
  ```markdown
  # 周报 YYYY-MM-DD ~ YYYY-MM-DD

  ## 本周完成
  - （从日记中提取 / 手动填写）

  ## 本周反思
  - （手动填写）

  ## 下周计划
  - （手动填写）
  ```
- 生成后可自由编辑修改

#### 2.4.2 周报列表与搜索

- 按时间倒序展示
- 支持全文搜索
- 分页展示，默认每页 10 条，可选 10/20/30/40/50/100

#### 2.4.3 周报操作

- 新建、编辑、删除周报
- 手动创建空白周报（不从日记聚合）
- 重新从日记聚合生成（覆盖当前内容，需确认）

### 2.5 标签系统

- 创建日记时输入标签，支持自动补全已有标签
- 标签管理页：查看所有标签及关联日记数量
- 支持重命名、删除标签
- 删除标签时从关联日记中移除该标签

### 2.6 Git 仓库备份

#### 2.6.1 备份配置

- 配置 GitHub / Gitee 仓库信息：
  - 仓库地址
  - 个人访问令牌（Personal Access Token）
  - 备份分支（默认 `main`）
  - 备份路径（默认 `diary/`）
- 支持分别配置 GitHub 和 Gitee 仓库
- Token 使用 AES-256 加密存储

#### 2.6.2 备份执行

- **手动备份**：点击"立即备份"按钮，通过 GitHub / Gitee REST API 推送
- 备份流程：
  1. 将日记和周报导出为 Markdown 文件
  2. 文件命名规则：`diary/YYYY/YYYY-MM-DD.md`、`weekly/YYYY/YYYY-Www.md`
  3. 通过 REST API 推送到指定仓库
  4. 记录备份状态（成功 / 失败 / 时间 / 提交 SHA）

#### 2.6.3 备份状态

- 显示最近一次备份时间、状态
- 备份失败时显示错误信息，支持重试

### 2.7 个人设置

- 修改密码
- 配置备份仓库
- 导出所有数据为 JSON / Markdown
- 删除账号（需二次确认，删除所有数据）

---

## 3. 技术架构

### 3.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | Next.js 16 (Turbopack) | App Router，前后端一体化 |
| UI 库 | React 19 + Tailwind CSS v4 | 原子化 CSS，响应式首选 |
| 组件库 | shadcn/ui | 可定制，与 Tailwind 深度集成 |
| 语言 | TypeScript | 全栈类型安全 |
| 认证 | Auth.js v5 (next-auth) | JWT Session + Credentials / GitHub / Gitee Provider |
| ORM | Prisma | 类型安全，schema 驱动 |
| 数据库 | SQLite (libsql) | 轻量，个人使用足够 |
| 编辑器 | @uiw/react-md-editor | Markdown 编辑 + 实时预览 |
| 图标 | Lucide React | 轻量统一 |
| 校验 | Zod | 请求体验证 |
| 密码加密 | bcryptjs | 盐轮 12 |
| Token 加密 | crypto (AES-256) | 备份 Token 加密 |

### 3.2 项目结构

```
.
├── prisma/
│   └── schema.prisma              # 数据库模型定义
├── src/
│   ├── app/
│   │   ├── (auth)/                 # 登录 / 注册
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/            # 主应用页面（需登录）
│   │   │   ├── dashboard/          # 仪表盘（活跃度热力图）
│   │   │   ├── diary/              # 日记列表
│   │   │   │   ├── new/            # 新建日记
│   │   │   │   └── [id]/edit/      # 编辑日记
│   │   │   ├── weekly/             # 周报列表
│   │   │   │   ├── new/            # 新建周报
│   │   │   │   └── [id]/edit/      # 编辑周报
│   │   │   ├── tags/               # 标签管理
│   │   │   └── settings/           # 系统设置
│   │   ├── api/
│   │   │   ├── auth/               # 认证接口
│   │   │   ├── diary/              # 日记 CRUD
│   │   │   ├── weekly/             # 周报 CRUD + 自动生成
│   │   │   ├── tags/               # 标签管理
│   │   │   ├── dashboard/          # 仪表盘统计
│   │   │   ├── backup/             # 备份配置与执行
│   │   │   └── settings/           # 设置与导出
│   │   ├── globals.css             # 全局样式 + CSS 变量
│   │   ├── layout.tsx              # 根布局（字体加载）
│   │   └── page.tsx                # 入口重定向
│   ├── components/
│   │   ├── layout/                 # AppLayout, Sidebar, BottomNav, AuthProvider
│   │   ├── diary/                  # DiaryForm
│   │   ├── weekly/                 # WeeklyForm
│   │   ├── editor/                 # MarkdownEditor, TagInput, MoodSelector
│   │   ├── backup/                 # BackupConfigForm
│   │   └── ui/                     # shadcn/ui 基础组件
│   ├── lib/
│   │   ├── auth.ts                 # Auth.js v5 配置
│   │   ├── prisma.ts               # Prisma 客户端单例
│   │   ├── diary.ts                # 日记数据层
│   │   ├── weekly.ts               # 周报数据层
│   │   ├── backup.ts               # 备份逻辑
│   │   ├── github.ts               # GitHub API 封装
│   │   ├── gitee.ts                # Gitee API 封装
│   │   ├── crypto.ts               # 加密工具
│   │   └── utils.ts                # 通用工具
│   └── middleware.ts               # 路由鉴权
├── .env                            # 环境变量
├── package.json
├── next.config.ts
└── tsconfig.json
```

### 3.3 数据模型

```
User ──┬── Diary ──┬── DiaryTag ── Tag
       │           └── (mood, pinned, date)
       ├── Weekly (startDate, endDate)
       ├── BackupConfig (provider, repoUrl, branch, path, token)
       ├── BackupLog (status, commitSha, message)
       ├── Account (OAuth provider accounts)
       └── Session (JWT sessions)
```

详细 schema：

```prisma
model User {
  id             String         @id @default(cuid())
  email          String         @unique
  emailVerified  DateTime?
  passwordHash   String?        // Credentials 用户有密码，OAuth 用户可能无
  name           String?
  image          String?
  accounts       Account[]
  sessions       Session[]
  diaries        Diary[]
  weeklies       Weekly[]
  tags           Tag[]
  backupConfigs  BackupConfig[]
  backupLogs     BackupLog[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String  // "github" | "gitee" | "credentials"
  providerAccountId String
  // ... OAuth tokens
  @@unique([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
}

model Diary {
  id        String    @id @default(cuid())
  userId    String
  title     String
  content   String    // Markdown 正文
  date      DateTime
  mood      String?   // happy | calm | normal | sad | awful | null
  pinned    Boolean   @default(false)
  tags      DiaryTag[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  @@index([userId, date])
  @@index([userId, pinned])
}

model Tag {
  id      String    @id @default(cuid())
  userId  String
  name    String
  diaries DiaryTag[]
  @@unique([userId, name])
}

model DiaryTag {
  diaryId String
  tagId   String
  diary   Diary  @relation(fields: [diaryId], references: [id], onDelete: Cascade)
  tag     Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([diaryId, tagId])
}

model Weekly {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String   // Markdown 正文
  startDate DateTime
  endDate   DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId, startDate])
}

model BackupConfig {
  id       String      @id @default(cuid())
  userId   String
  provider String      // "github" | "gitee"
  repoUrl  String
  branch   String      @default("main")
  path     String      @default("diary/")
  token    String      // AES-256 加密存储
  logs     BackupLog[]
  @@unique([userId, provider])
}

model BackupLog {
  id        String       @id @default(cuid())
  userId    String
  configId  String
  status    String       // "success" | "failed"
  commitSha String?
  message   String?
  config    BackupConfig @relation(...)
  createdAt DateTime     @default(now())
  @@index([userId, createdAt])
}
```

### 3.4 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| GET/POST | `/api/auth/[...nextauth]` | Auth.js 认证路由 |
| GET | `/api/dashboard/stats?year=` | 仪表盘统计（含活跃度数据） |
| GET | `/api/diary` | 日记列表（分页、搜索、筛选） |
| POST | `/api/diary` | 创建日记 |
| GET | `/api/diary/[id]` | 日记详情 |
| PUT | `/api/diary/[id]` | 更新日记 |
| DELETE | `/api/diary/[id]` | 删除日记 |
| POST | `/api/diary/[id]` | 置顶 / 取消置顶 |
| GET | `/api/weekly` | 周报列表 |
| POST | `/api/weekly` | 创建周报 |
| POST | `/api/weekly/generate` | 从日记聚合生成周报 |
| GET | `/api/weekly/[id]` | 周报详情 |
| PUT | `/api/weekly/[id]` | 更新周报 |
| DELETE | `/api/weekly/[id]` | 删除周报 |
| GET | `/api/tags` | 标签列表 |
| POST | `/api/tags` | 新建标签 |
| PUT | `/api/tags/[id]` | 重命名标签 |
| DELETE | `/api/tags/[id]` | 删除标签 |
| GET | `/api/settings/export` | 导出数据（JSON / Markdown） |
| PUT | `/api/settings/password` | 修改密码 |
| GET | `/api/backup/config` | 获取备份配置 |
| POST | `/api/backup/config` | 保存备份配置 |
| POST | `/api/backup/execute` | 执行备份 |
| GET | `/api/backup/logs` | 备份日志 |

---

## 4. UI / UX 设计

### 4.1 响应式布局策略

| 断点 | 宽度 | 布局 |
|------|------|------|
| 移动端 | < 768px | 底部 Tab 导航（BottomNav），单列内容，热力图横向滑动 |
| 桌面端 | >= 768px | 左侧固定侧边栏（Sidebar 240px）+ 右侧主内容区，最大宽度 7xl |

### 4.2 字体与视觉

- **标题 / Logo**：Noto Serif SC（衬线字体，`var(--font-serif)`）
- **正文**：Noto Sans SC（无衬线字体，`var(--font-sans)`）
- **等宽**：Geist Mono（代码块，`var(--font-mono)`）
- **图标集**：Lucide React
- **Logo 图标**：Feather（羽毛笔）
- **主色调**：Tailwind CSS v4 语义色变量

### 4.3 页面清单

1. **登录页** — 邮箱密码表单 + GitHub / Gitee OAuth 按钮
2. **注册页** — 邮箱、密码、确认密码
3. **仪表盘** — 统计卡片 + 年度活跃度热力图 + 本周活跃度 + 最近动态 + 快速入口
4. **日记列表页** — 搜索栏 + 筛选 + 日记卡片列表 + 分页（含每页条数选择）
5. **日记编辑页** — Markdown 编辑器 + 标签 + 日期 + 心情
6. **周报列表页** — 周报卡片列表 + 分页
7. **周报编辑页** — Markdown 编辑器 + 日期范围选择 + 聚合按钮
8. **标签管理页** — 标签列表 + 关联日记数 + 重命名 / 删除
9. **设置页** — 密码修改、备份配置、数据导出

### 4.4 导航结构

**桌面端（Sidebar）：**
- 仪表盘 → `/dashboard`
- 日记本 → `/diary`
- 周报 → `/weekly`
- 标签 → `/tags`
- 设置 → `/settings`

**移动端（BottomNav）：** 同上 5 项，图标 + 文字标签。

---

## 5. 非功能需求

### 5.1 安全

- 密码使用 bcrypt 哈希存储（salt rounds = 12）
- JWT Token 使用 httpOnly Cookie
- CSRF 防护（Auth.js v5 内置）
- Git 备份 Token 使用 AES-256 加密存储
- API 路由均需认证校验（middleware 鉴权）
- 输入校验：Zod schema 验证所有请求体
- 生产环境 `trustHost: true` 防止 UntrustedHost 错误

### 5.2 性能

- 首屏加载 < 2s
- 日记列表支持分页，默认 10 条，可选 10-100
- 仪表盘 API 使用并行 Prisma 查询（Promise.all）
- 图片资源使用 Next.js Image 优化

### 5.3 兼容性

- 响应式适配桌面浏览器（>= 1024px）和移动端（< 768px）
- 热力图和月度分布图表移动端支持横向滑动（`overflow-x-auto touch-pan-x`）
- 热力图最小宽度 600px，月度分布最小宽度 400px

---

## 6. 开发里程碑

### Phase 1：基础框架 ✅

- Next.js 16 项目初始化 + Tailwind CSS v4 + shadcn/ui
- Prisma + SQLite 配置 + 数据模型
- Auth.js v5 认证（Credentials + GitHub OAuth）
- 基础布局组件（响应式 Sidebar / BottomNav）

### Phase 2：核心功能 ✅

- 日记 CRUD + Markdown 编辑器
- 标签系统
- 日记列表 + 搜索 + 筛选 + 分页
- 周报 CRUD + 聚合生成

### Phase 3：仪表盘与可视化 ✅

- 仪表盘页面（统计卡片、活跃度热力图、周活跃度、最近动态）
- Gitee 风格年度活跃度热力图（百分比自适应 + 横向滑动）
- 年度月度分布柱状图
- 字体优化（Noto Serif SC + Noto Sans SC）

### Phase 4：备份与部署 ✅

- Gitee OAuth 自定义 Provider
- Git 仓库备份功能
- 备份配置与日志
- 个人设置页
- 生产环境部署（PM2 + Nginx）
- 移动端适配优化

### Phase 5：后续规划

- 全文搜索优化
- 日历视图（月度日历按日期查看日记）
- 数据导出增强
- Docker 容器化部署

---

## 7. 部署

### 7.1 本地开发

```bash
npm install
cp .env .env.local   # 编辑密钥
npx prisma generate
npx prisma db push
npm run dev           # http://localhost:3000
```

### 7.2 Linux 生产环境 (PM2 + Nginx)

```bash
npm install && npx prisma generate && npx prisma db push && npm run build
pm2 start npm --name "weekly-report" -- start
```

Nginx 反向代理 `127.0.0.1:3000`，配置 HTTPS。

### 7.3 数据库备份

SQLite 单文件 `dev.db`，直接复制即可备份 / 恢复。

---

## 8. 约束与假设

- **个人使用**：不考虑多租户、权限管理、协作功能
- **单用户部署**：SQLite 足够，无需 PostgreSQL
- **不支持 Vercel 免费部署**：SQLite 数据文件无法在 serverless 环境持久化；如需 Vercel 需迁移至 Turso 等云数据库
- **Git 备份**：依赖 GitHub / Gitee API 可用性
- **无图片上传**：第一版不支持图片附件
- **界面语言**：默认中文
