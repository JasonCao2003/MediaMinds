# MediaMinds · Next.js 前端

> MediaMinds 智能书影音管理系统的前端，基于 **Next.js 15（App Router）+ TypeScript + Material UI v6** 构建。
> 通过后端网关（Spring Cloud Gateway）的 REST 接口与微服务通信。

---

## ✨ 技术栈

| 领域 | 选型 |
| --- | --- |
| 框架 | Next.js 15（App Router） |
| 语言 | TypeScript 5 |
| UI 库 | Material UI (MUI) v6 —— Material Design 3 风格 |
| 状态管理 | Zustand（持久化） |
| 请求 | Axios（拦截器封装） |
| 字体 | JetBrains Maple Mono（ZSFT CDN，按 unicode-range 分片加载） |

---

## 🎨 设计系统

- **仅深色「Midnight」主题**：近黑深蓝背景 + 大圆角悬浮外壳，不提供浅色切换
- **强调色**浅紫 `#7C7FF2`，低饱和卡片与颗粒质感
- **导航**：左侧纯图标轨道（悬停提示；管理分组悬停弹出子菜单）
- **无障碍**：键盘可达，图标按钮均带 `aria-label`

主题令牌定义见 [`src/lib/theme.ts`](src/lib/theme.ts)。

---

## 🚀 快速开始

```bash
cd MediaMinds_next
npm install
npm run build    # 生产构建
npm start        # 生产模式启动（http://localhost:5173）
npm run dev      # 开发模式（带 HMR，仅本地调试用）
npm run typecheck
```

### 后端代理

开发环境通过 `next.config.mjs` 的 `rewrites` 转发请求：

| 前端路径 | 代理目标 | 说明 |
| --- | --- | --- |
| `/api/**` | `http://localhost:8080/**` | 网关（Spring Cloud Gateway） |
| `/oss/**` | `http://localhost:9000/mediaminds/**` | MinIO 对象存储 |

可通过环境变量覆盖（见 `.env.example`）：`GATEWAY_URL`、`MINIO_URL`。

---

## 📂 目录结构

```
MediaMinds_next/
├── next.config.mjs          # rewrites 代理配置
├── src/
│   ├── app/
│   │   ├── layout.tsx       # 根布局（字体 + Providers）
│   │   ├── providers.tsx    # 主题 / 全局提示 / 确认框 / 鉴权引导
│   │   ├── login/           # 登录注册
│   │   ├── 404/
│   │   └── (user)/content/  # 全部页面：欢迎页、图书、阅读器、视频、播放器、
│   │                        # 音乐、智能入库、个人信息
│   ├── api/                 # 接口封装（login/user/book/music/kugou/tmdb/video/agent/stats）
│   ├── components/          # 布局与通用组件
│   ├── lib/                 # 请求、主题、全局提示、分页工具
│   ├── stores/              # Zustand：auth / player
│   └── types/               # 公共类型
└── public/                  # 静态资源
```

---

## 🧩 路由一览

全部页面统一在 `/content` 下：

- `/content` 欢迎页 · `/content/book` 图书浏览 · `/content/book/read/[id]` 在线阅读器
- `/content/video` 视频浏览 · `/content/movie/play/[id]` 视频播放
- `/content/music` 音乐浏览（含「酷狗搜索」标签）· `/content/agent` 智能入库
- `/content/profile` 个人信息

---

## 🔐 鉴权说明

- 登录后 token 与用户信息持久化于 `localStorage`（Zustand persist）
- 所有页面统一由 `UserLayout` + `useRequireAuth` 做客户端登录守卫（单角色，无权限校验）
- 请求拦截器自动注入 `Authorization`，401 时清理登录态并跳转登录页

---

## 📝 说明

- 本前端为独立工程，构建产物与后端微服务互不影响。
- API 协议与后端网关完全对齐（如 `list`/`records`、`page`/`pageNum` 的差异已在封装层归一化）。
- 「智能入库」页对接后端 `agent-service`（LangChain4j + DeepSeek），支持多轮对话与批量入库。
