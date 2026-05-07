# 日记与周报系统 — 产品需求文档 (PRD)

> 版本：1.0
> 日期：2026-05-07
> 技术方案：Next.js App Router + NextAuth.js + Prisma + SQLite

---

## 1. 产品概述

### 1.1 产品定位

面向个人用户的日记与周报管理工具，支持 Markdown 编写、标签分类、全文搜索，以及将数据备份到 GitHub/Gitee 仓库。Web 端与移动端自适应响应式布局。

### 1.2 目标用户

个人开发者/知识工作者，需要：
- 日常记录工作日志和个人日记
- 按周汇总生成周报
- 数据自主可控，可备份到自有 Git 仓库
- 随时随地通过手机或电脑访问

### 1.3 核心价值

- **简洁专注**：只做日记和周报，不做大而全
- **数据自主**：SQLite 本地存储 + Git 仓库备份，数据始终在自己手中
- **随时访问**：响应式设计，桌面和手机体验一致

---

## 2. 功能需求

### 2.1 用户认证

#### 2.1.1 账号密码注册/登录

- 注册：邮箱 + 密码，密码最少 8 位，需包含字母和数字
- 登录：邮箱 + 密码
- 支持修改密码、忘记密码（通过注册邮箱重置）
- Session 策略：JWT Token，有效期 7 天

#### 2.1.2 第三方 OAuth 登录

- **GitHub 登录**：NextAuth.js 内置 GitHub Provider
- **Gitee 登录**：自定义 OAuth Provider（Gitee OAuth2 兼容 GitHub 规范）
- 首次 OAuth 登录自动创建账号，关联第三方账号
- 支持在设置页绑定/解绑第三方账号

### 2.2 日记管理

#### 2.2.1 日记编写

- Markdown 编辑器，支持实时预览
- 工具栏：加粗、斜体、标题、列表、代码块、链接、引用
- 每篇日记包含：
  - 标题（必填）
  - 正文（Markdown，必填）
  - 日期（默认当天，可修改）
  - 标签（可选，多标签）
  - 心情标记（可选：开心/平静/一般/低落/难过）
  - 创建时间 / 更新时间（自动）

#### 2.2.2 日记列表与搜索

- 按日期倒序展示日记列表
- 支持按标签筛选
- 支持按日期范围筛选
- 全文搜索（标题 + 正文内容）
- 列表项显示：标题、日期、前 100 字摘要、标签

#### 2.2.3 日记操作

- 新建、编辑、删除日记
- 删除需二次确认
- 支持日记置顶

### 2.3 周报管理

#### 2.3.1 周报生成

- 选择日期范围（默认当周 周一至周日）
- 自动聚合该日期范围内的日记，生成周报草稿
- 周报结构模板：
  ```markdown
  # 周报 YYYY-MM-DD ~ YYYY-MM-DD

  ## 本周完成
  - （从日记中提取/手动填写）

  ## 本周反思
  - （手动填写）

  ## 下周计划
  - （手动填写）
  ```
- 生成后可自由编辑修改

#### 2.3.2 周报列表与搜索

- 按时间倒序展示
- 支持全文搜索
- 显示：标题、日期范围、摘要

#### 2.3.3 周报操作

- 新建、编辑、删除周报
- 手动创建空白周报（不从日记聚合）
- 重新从日记聚合生成（覆盖当前内容，需确认）

### 2.4 标签系统

- 创建日记时输入标签，支持自动补全已有标签
- 标签管理页：查看所有标签及关联日记数量
- 支持重命名、删除标签
- 删除标签时从关联日记中移除该标签

### 2.5 Git 仓库备份

#### 2.5.1 备份配置

- 在设置页配置 GitHub/Gitee 仓库信息：
  - 仓库地址（如 `https://github.com/username/diary-backup`）
  - 个人访问令牌（Personal Access Token）
  - 备份分支（默认 `main`）
  - 备份路径（默认 `diary/`）
- 支持分别配置 GitHub 和 Gitee 仓库
- 配置信息加密存储

#### 2.5.2 备份执行

- **手动备份**：点击"立即备份"按钮
- **自动备份**：可选每日定时备份（通过 cron 或系统定时任务）
- 备份流程：
  1. 将日记和周报导出为 Markdown 文件
  2. 文件命名规则：`diary/YYYY/YYYY-MM-DD.md`、`weekly/YYYY/YYYY-Www.md`
  3. 通过 GitHub/Gitee REST API 推送到指定仓库
  4. 记录备份状态（成功/失败/时间/提交SHA）

#### 2.5.3 备份状态

- 显示最近一次备份时间、状态
- 显示备份历史记录（最近 20 条）
- 备份失败时显示错误信息，支持重试

### 2.6 个人设置

- 修改密码
- 绑定/解绑 GitHub、Gitee 账号
- 配置备份仓库
- 导出所有数据为 JSON（完整数据备份）
- 删除账号（需二次确认，删除所有数据）

---

## 3. 技术架构

### 3.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | Next.js 14+ (App Router) | 前后端一体化 |
| 认证 | NextAuth.js v5 | GitHub Provider + 自定义 Gitee Provider |
| ORM | Prisma | 类型安全，schema 驱动 |
| 数据库 | SQLite (better-sqlite3) | 轻量，个人使用足够 |
| 样式 | Tailwind CSS | 原子化 CSS，响应式首选 |
| 组件库 | shadcn/ui | 可定制，与 Tailwind 深度集成 |
| Markdown 编辑 | @uiw/react-md-editor 或 Milkdown | 所见即所得 + 源码模式 |
| 图标 | Lucide React | 轻量统一 |
| Git API | @octokit/rest (GitHub) + node-fetch (Gitee) | 仓库备份 |

### 3.2 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # 认证相关页面
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/          # 主业务页面（需登录）
│   │   ├── diary/            # 日记
│   │   ├── weekly/           # 周报
│   │   ├── tags/             # 标签管理
│   │   └── settings/         # 设置
│   ├── api/                  # API 路由
│   │   ├── auth/             # NextAuth 路由
│   │   ├── diary/
│   │   ├── weekly/
│   │   ├── tags/
│   │   ├── backup/
│   │   └── settings/
│   ├── layout.tsx
│   └── page.tsx              # 首页/重定向到登录
├── components/               # 通用组件
│   ├── ui/                   # shadcn/ui 组件
│   ├── layout/               # 布局组件（侧边栏、顶栏、底部导航）
│   ├── editor/               # Markdown 编辑器组件
│   └── backup/               # 备份相关组件
├── lib/                      # 工具库
│   ├── auth.ts               # NextAuth 配置
│   ├── prisma.ts             # Prisma 客户端单例
│   ├── github.ts             # GitHub API 封装
│   ├── gitee.ts              # Gitee API 封装
│   └── backup.ts             # 备份逻辑
├── prisma/
│   └── schema.prisma         # 数据模型
└── types/                    # TypeScript 类型定义
```

### 3.3 数据模型

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?             // OAuth 用户可能无密码
  name          String?
  image         String?
  diaries       Diary[]
  weeklies      Weekly[]
  tags          Tag[]
  accounts      Account[]
  backupConfigs BackupConfig[]
  backupLogs    BackupLog[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id           String  @id @default(cuid())
  userId       String
  provider     String  // "github" | "gitee"
  providerId   String  // 第三方用户ID
  accessToken  String? // 加密存储
  refreshToken String?
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
}

model Diary {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String   // Markdown 正文
  date      DateTime // 日记日期
  mood      String?  // happy/calm/normal/sad/awful
  pinned    Boolean  @default(false)
  tags      DiaryTag[]
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, date])
  @@index([userId, pinned])
}

model Tag {
  id      String     @id @default(cuid())
  userId  String
  name    String
  diaries DiaryTag[]
  user    User       @relation(fields: [userId], references: [id], onDelete: Cascade)

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
  startDate DateTime // 周起始日期
  endDate   DateTime // 周结束日期
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, startDate])
}

model BackupConfig {
  id         String  @id @default(cuid())
  userId     String
  provider   String  // "github" | "gitee"
  repoUrl    String
  branch     String  @default("main")
  path       String  @default("diary/")
  token      String  // 加密存储
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
}

model BackupLog {
  id        String   @id @default(cuid())
  userId    String
  configId  String
  status    String   // "success" | "failed"
  commitSha String?
  message   String?  // 失败时的错误信息
  config    BackupConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
```

### 3.4 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth 登录 |
| GET | `/api/diary` | 日记列表（分页、搜索、筛选） |
| POST | `/api/diary` | 创建日记 |
| GET | `/api/diary/:id` | 日记详情 |
| PUT | `/api/diary/:id` | 更新日记 |
| DELETE | `/api/diary/:id` | 删除日记 |
| POST | `/api/diary/:id/pin` | 置顶/取消置顶 |
| GET | `/api/weekly` | 周报列表 |
| POST | `/api/weekly` | 创建周报 |
| POST | `/api/weekly/generate` | 从日记聚合生成周报 |
| GET | `/api/weekly/:id` | 周报详情 |
| PUT | `/api/weekly/:id` | 更新周报 |
| DELETE | `/api/weekly/:id` | 删除周报 |
| GET | `/api/tags` | 标签列表 |
| PUT | `/api/tags/:id` | 重命名标签 |
| DELETE | `/api/tags/:id` | 删除标签 |
| GET | `/api/backup/config` | 获取备份配置 |
| PUT | `/api/backup/config` | 更新备份配置 |
| POST | `/api/backup/execute` | 执行备份 |
| GET | `/api/backup/logs` | 备份日志 |
| GET | `/api/settings` | 获取用户设置 |
| PUT | `/api/settings/password` | 修改密码 |
| POST | `/api/settings/export` | 导出数据 |
| DELETE | `/api/settings/account` | 删除账号 |

### 3.5 Git 备份流程

```
用户点击"立即备份"
       │
       ▼
  读取 BackupConfig
       │
       ▼
  查询新增/修改的日记和周报
       │
       ▼
  生成 Markdown 文件
  diary/2026/2026-05-07.md
  weekly/2026/2026-W19.md
       │
       ▼
  调用 GitHub/Gitee API
  ┌─────────────────┐
  │ 1. GET 仓库信息   │
  │ 2. GET 当前文件SHA│
  │ 3. PUT 创建/更新  │
  └─────────────────┘
       │
       ▼
  记录 BackupLog
  (成功: commitSha / 失败: errorMessage)
```

---

## 4. UI/UX 设计

### 4.1 响应式布局策略

| 断点 | 宽度 | 布局 |
|------|------|------|
| 移动端 | < 768px | 底部Tab导航，单列内容，全屏编辑器 |
| 平板端 | 768px - 1024px | 侧边栏折叠，主内容区自适应 |
| 桌面端 | > 1024px | 左侧固定侧边栏 + 右侧主内容区 |

### 4.2 页面清单

1. **登录页** — 账号密码表单 + GitHub/Gitee 登录按钮
2. **注册页** — 邮箱、密码、确认密码
3. **日记列表页** — 搜索栏 + 筛选 + 日记卡片列表
4. **日记编辑页** — Markdown 编辑器 + 标签 + 日期 + 心情
5. **周报列表页** — 周报卡片列表
6. **周报编辑页** — Markdown 编辑器 + 聚合按钮
7. **标签管理页** — 标签列表 + 关联日记数
8. **设置页** — 密码修改、账号绑定、备份配置、数据导出

### 4.3 移动端适配要点

- 底部导航栏：首页（日记）、周报、标签、设置
- 编辑器全屏模式
- 列表采用卡片式布局，手势滑动删除
- 浮动按钮 (FAB) 快速新建日记

---

## 5. 非功能需求

### 5.1 安全

- 密码使用 bcrypt 哈希存储（salt rounds = 12）
- JWT Token 使用 httpOnly Cookie
- CSRF 防护（NextAuth 内置）
- Git 备份 Token 使用 AES-256 加密存储
- API 路由均需认证校验
- 输入校验：Zod schema 验证所有请求体

### 5.2 性能

- 首屏加载 < 2s
- 日记列表支持分页（每页 20 条）
- Markdown 编辑器懒加载
- 图片资源使用 Next.js Image 优化

### 5.3 可靠性

- Git 备份失败不丢失本地数据
- 备份操作幂等（重复推送不产生重复文件）
- 数据库定期自动备份（SQLite 文件复制）

---

## 6. 开发里程碑

### Phase 1：基础框架（第1-2周）

- Next.js 项目初始化 + Tailwind + shadcn/ui
- Prisma + SQLite 配置 + 数据模型
- NextAuth 认证（密码 + GitHub OAuth）
- 基础布局组件（响应式侧边栏/底部导航）

### Phase 2：核心功能（第3-4周）

- 日记 CRUD + Markdown 编辑器
- 标签系统
- 日记列表 + 搜索 + 筛选
- 周报 CRUD + 聚合生成

### Phase 3：备份与完善（第5-6周）

- Gitee OAuth 登录
- Git 仓库备份功能
- 备份配置与日志
- 个人设置页

### Phase 4：优化与发布（第7-8周）

- 移动端适配优化
- 全文搜索优化
- 数据导出
- 整体 UI 打磨

---

## 7. 约束与假设

- **个人使用**：不考虑多租户、权限管理、协作功能
- **单用户部署**：SQLite 足够，无需 PostgreSQL
- **Git 备份**：依赖 GitHub/Gitee API 可用性，不做本地 Git 操作
- **无图片上传**：第一版不支持图片附件，保持简单
- **中英文支持**：界面默认中文，代码注释英文
