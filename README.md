<div align="center">

# Duckov Mod OpenAnnouncements

<p align="center">
  <img src="public/logo_light.jpg"/>
</p>

### 逃离鸭科夫 Mod 公告站

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![MUI](https://img.shields.io/badge/MUI-7.3-007FFF?style=flat-square&logo=mui&logoColor=white)](https://mui.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" alt="PRs Welcome"/>
  <img src="https://img.shields.io/badge/Made%20with-Love-ff69b4?style=for-the-badge" alt="Made with Love"/>
</p>

<p align="center">
  <strong>一个现代化的 Mod 公告发布与管理平台</strong>
</p>

<p align="center">
  <a href="#-功能特性">功能特性</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-项目结构">项目结构</a> •
  <a href="#-api-文档">API 文档</a> •
  <a href="#-部署指南">部署指南</a>
</p>

---

</div>

## 📖 项目简介

**Duckov Mod OpenAnnouncements** 是一个专为游戏 Mod 社区打造的公告管理系统。它提供了完整的公告发布、用户管理、权限控制和 API 集成功能，支持 Web 端展示和 Unity 客户端读取。

### 为什么选择它？

- 🚀 **现代技术栈** - React 18 + TypeScript + Vite，极致开发体验
- 🎨 **精美 UI** - Material-UI 组件库，支持浅色/深色主题
- 🔐 **完善权限** - RBAC 权限模型，多角色精细控制
- ☁️ **边缘部署** - Cloudflare Workers 无服务器架构，全球加速
- 🔌 **API 友好** - RESTful API，支持 CI/CD 自动化推送

---

## ✨ 功能特性

<table>
<tr>
<td width="50%">

### 📢 公告管理
- 富文本编辑器（Tiptap）
- 版本号智能排序
- 多格式输出（HTML/纯文本）
- 公告展开/折叠预览

</td>
<td width="50%">

### 👥 用户管理
- 多角色权限（Super/Editor/Guest）
- Mod 级别访问控制
- 用户启用/停用
- 安全密码重置

</td>
</tr>
<tr>
<td width="50%">

### 🎮 Mod 管理
- 创建/删除 Mod 分类
- 拖拽排序
- 灵活的 ID 别名匹配
- 多 Mod 独立公告流

</td>
<td width="50%">

### 🔑 API Key 管理
- 生成专用 API 密钥
- 限定 Mod 访问范围
- 密钥撤销功能
- 支持自动化推送

</td>
</tr>
</table>

### 🎨 界面预览

| 浅色主题 | 深色主题 |
|:---:|:---:|
| 清新简洁的日间模式 | 护眼舒适的夜间模式 |

---

## 🛠️ 技术栈

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.2.0 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Vite | 6.2 | 构建工具 |
| MUI | 7.3 | 组件库 |
| Tiptap | 3.13 | 富文本编辑 |
| Emotion | 11.14 | CSS-in-JS |

### 后端

| 技术 | 说明 |
|------|------|
| Cloudflare Workers | 无服务器运行时 |
| Workers KV | 分布式键值存储 |
| PBKDF2-SHA256 | 密码加密 |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8（推荐）

### 本地开发（Mock 模式）

```bash
# 克隆项目
git clone https://github.com/your-username/duckov-mod-open-announcements.git
cd duckov-mod-open-announcements

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

> 💡 Mock 模式下不需要配置 Cloudflare。首次访问需要完成"系统初始化"创建超级管理员。
>
> 如需预置演示账号，在 `.env.local` 中设置 `VITE_MOCK_SEED_USERS=true`。

### 本地开发（Worker + KV）

<details>
<summary>📋 点击展开详细步骤</summary>

#### 1. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local
```

编辑 `.env.local`:
```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://127.0.0.1:8787
```

#### 2. 配置 Worker 密钥

创建 `.dev.vars` 文件（不要提交到 Git）：
```env
INIT_TOKEN=your-secure-random-token
```

#### 3. 配置 KV 命名空间

在 `wrangler.toml` 中填写 KV 配置：
```toml
[[kv_namespaces]]
binding = "ANNOUNCEMENTS_KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-id"
```

#### 4. 启动服务

```bash
# 终端 A - 启动 Worker
pnpm worker:dev

# 终端 B - 启动前端
pnpm dev
```

#### 5. 初始化系统

```bash
curl -X POST http://127.0.0.1:8787/api/system/init \
  -H "Content-Type: application/json" \
  -H "X-Init-Token: your-secure-random-token" \
  -d '{
    "username": "admin",
    "password": "your-strong-password",
    "displayName": "系统管理员"
  }'
```

</details>

---

## 📁 项目结构

```
duckov-mod-open-announcements/
├── 📂 components/              # React 组件
│   ├── 📂 admin/              # 管理功能组件
│   │   ├── AdminTools.tsx     # 管理工具标签页
│   │   ├── ModManager.tsx     # Mod 管理
│   │   ├── UserManager.tsx    # 用户管理
│   │   └── ApiKeyManager.tsx  # API Key 管理
│   ├── 📂 dashboard/          # 仪表盘组件
│   │   └── AnnouncementsPanel.tsx
│   ├── 📂 layout/             # 布局组件
│   ├── AnnouncementCard.tsx   # 公告卡片
│   └── Editor.tsx             # 富文本编辑器
│
├── 📂 pages/                   # 页面组件
│   ├── Dashboard.tsx          # 公告列表页
│   └── Admin.tsx              # 管理面板
│
├── 📂 services/                # API 服务层
│   ├── apiService.ts          # 统一 API 接口
│   └── mockDb.ts              # Mock 数据库
│
├── 📂 workers/                 # Cloudflare Worker
│   └── src/index.ts           # Worker 入口
│
├── 📂 hooks/                   # 自定义 Hooks
├── 📂 utils/                   # 工具函数
├── 📂 theme/                   # 主题配置
│
├── App.tsx                    # 应用入口
├── types.ts                   # 类型定义
└── constants.ts               # 常量配置
```

---

## 📚 API 文档

### 认证

所有需要认证的接口需要在请求头携带 Token：

```http
Authorization: Bearer <token>
```

### 公开接口

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/public/list?modId=xxx` | 获取公告列表 |
| `GET` | `/api/mod/list` | 获取 Mod 列表 |

### 认证接口

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| `POST` | `/api/auth/login` | 用户登录 | - |
| `POST` | `/api/admin/post` | 创建公告 | Editor+ |
| `POST` | `/api/admin/update` | 更新公告 | Editor+ |
| `POST` | `/api/admin/delete` | 删除公告 | Super |

### 管理接口

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| `POST` | `/api/mod/create` | 创建 Mod | Super |
| `POST` | `/api/mod/delete` | 删除 Mod | Super |
| `GET` | `/api/user/list` | 用户列表 | Super |
| `POST` | `/api/user/create` | 创建用户 | Super |
| `POST` | `/api/apikey/create` | 创建 API Key | Editor+ |

<details>
<summary>📋 完整 API 端点列表</summary>

```
POST   /api/system/init          # 系统初始化
POST   /api/auth/login           # 登录
POST   /api/auth/change-password # 修改密码

GET    /api/mod/list             # Mod 列表
POST   /api/mod/create           # 创建 Mod
POST   /api/mod/delete           # 删除 Mod
POST   /api/mod/reorder          # 排序 Mod

GET    /api/user/list            # 用户列表
POST   /api/user/create          # 创建用户
POST   /api/user/delete          # 删除用户
POST   /api/user/update          # 更新用户
POST   /api/user/set-status      # 设置状态
POST   /api/user/reset-password  # 重置密码

GET    /api/public/list          # 公告列表
POST   /api/admin/post           # 创建公告
POST   /api/admin/update         # 更新公告
POST   /api/admin/delete         # 删除公告

GET    /api/apikey/list          # API Key 列表
POST   /api/apikey/create        # 创建 API Key
POST   /api/apikey/revoke        # 撤销 API Key
```

</details>

---

## 🔐 权限模型

系统采用 RBAC（基于角色的访问控制）模型：

| 角色 | 代码 | Mod 管理 | 用户管理 | 公告编辑 | 说明 |
|------|------|:---:|:---:|:---:|------|
| **超级管理员** | `super` | ✅ | ✅ | ✅ 全部 | 完全控制权限 |
| **编辑** | `editor` | ❌ | ❌ | ✅ 授权的 | 仅可编辑被授权的 Mod |
| **访客** | `guest` | ❌ | ❌ | ❌ | 只读访问 |

---

## 🚢 部署指南

### 部署到 Cloudflare Workers

```bash
# 1. 登录 Cloudflare
wrangler login

# 2. 创建 KV 命名空间
wrangler kv:namespace create "ANNOUNCEMENTS_KV"

# 3. 配置 wrangler.toml 中的 KV ID

# 4. 设置生产密钥
wrangler secret put INIT_TOKEN

# 5. 部署
pnpm worker:deploy
```

### 构建前端

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

---

## 📝 开发脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动前端开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览生产构建 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm worker:dev` | 启动 Worker 开发服务器 |
| `pnpm worker:deploy` | 部署 Worker 到生产环境 |
| `pnpm check` | 完整检查（类型 + 构建） |

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<div align="center">

**如果你觉得这个项目有用，请给它一个 ⭐️**

Made with ❤️ by Guducat

</div>
