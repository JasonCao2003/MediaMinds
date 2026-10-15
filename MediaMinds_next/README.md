# MediaMinds · Next.js 前端

> MediaMinds 智能书影音管理系统的前端，基于 **Next.js 15（App Router）+ TypeScript + Material UI v6** 构建。
> 通过后端网关（Spring Cloud Gateway）的 REST 接口与 WebSocket 通知服务与微服务通信。

---

## ✨ 技术栈

| 领域 | 选型 |
| --- | --- |
| 框架 | Next.js 15（App Router） |
| 语言 | TypeScript 5 |
| UI 库 | Material UI (MUI) v6 —— Material Design 3 风格 |
| 状态管理 | Zustand（持久化，替代 Pinia） |
| 请求 | Axios（拦截器封装，替代原 `request.js`） |
| 实时通信 | @stomp/stompjs + SockJS |
| 图表 | ECharts（echarts-for-react） |
| 字体 | Roboto + Poppins（next/font） |

---

## 🎨 设计系统

- **Material Design 3 颜色角色**：Primary 靛蓝紫 `#4F46E5` / Secondary 玫红 `#E11D48` / Success 青绿 `#0D9488`
- **明暗双主题**：右上角一键切换，偏好写入 `localStorage`
- **Material 动效**：统一使用 `cubic-bezier(.2,0,0,1)` 缓动，`prefers-reduced-motion` 自动降级
- **无障碍**：正文对比度 ≥ 4.5:1，键盘可达，图标按钮均带 `aria-label`

主题令牌定义见 [`src/lib/theme.ts`](src/lib/theme.ts)。

---

## 🚀 快速开始

```bash
cd MediaMinds_next
npm install
npm run dev      # http://localhost:5173
npm run build    # 生产构建
npm start        # 生产模式启动
npm run typecheck
```

### 后端代理

开发环境通过 `next.config.mjs` 的 `rewrites` 转发请求：

| 前端路径 | 代理目标 | 说明 |
| --- | --- | --- |
| `/api/**` | `http://localhost:8080/**` | 网关（Spring Cloud Gateway） |
| `/oss/**` | `http://localhost:9000/mediaminds/**` | MinIO 对象存储 |
| `/ws/**` | `http://localhost:9001/ws/**` | 通知服务（STOMP/SockJS） |

可通过环境变量覆盖（见 `.env.example`）：`GATEWAY_URL`、`MINIO_URL`、`WS_URL`。

---

## 📂 目录结构

```
MediaMinds_next/
├── next.config.mjs          # rewrites 代理配置
├── src/
│   ├── app/
│   │   ├── layout.tsx       # 根布局（字体 + Providers）
│   │   ├── providers.tsx    # 主题 / 通知 / 确认框 / 鉴权引导
│   │   ├── login/           # 登录注册（账号 / 邮箱 / 人脸）
│   │   ├── 404/
│   │   ├── (user)/content/  # 用户端：欢迎页、图书、阅读器、视频、播放器、
│   │   │                    # 音乐、酷狗、个人信息、消息
│   │   └── (admin)/admin/   # 管理端：控制面板、用户、图书、音乐、视频
│   ├── api/                 # 接口封装（login/user/book/music/video/kugou/tmdb/admin）
│   ├── components/          # 布局、通用组件、管理端 CRUD 脚手架
│   ├── lib/                 # 请求、WebSocket、主题、通知、分页工具
│   ├── stores/              # Zustand：auth / message / player
│   └── types/               # 公共类型
└── public/                  # 静态资源
```

---

## 🧩 路由一览

**用户端（`/content`）**
- `/content` 欢迎页 · `/content/book` 图书浏览 · `/content/book/read/[id]` 在线阅读器
- `/content/video` 视频浏览 · `/content/movie/play/[id]` 视频播放
- `/content/music` 音乐浏览 · `/content/kugou` 酷狗音乐
- `/content/message` 消息中心 · `/content/profile` 个人信息

**管理端（`/admin`）**
- `/admin/dashboard` 控制面板 · `/admin/users` 用户管理
- `/admin/book/{manage,type,chapter}` · `/admin/music/{songs,singers,songlists,comments}`
- `/admin/video/{movies,categories,comments}`

---

## 🔐 鉴权说明

- 登录后 token 与用户信息持久化于 `localStorage`（Zustand persist）
- `UserLayout` / `AdminLayout` 通过 `useRequireAuth` 做客户端守卫；管理端额外校验 `role === 'admin'`
- 请求拦截器自动注入 `Authorization`，401 时清理登录态并跳转登录页

---

## 📝 说明

- 本前端为独立工程，构建产物与后端微服务互不影响。
- API 协议与后端网关完全对齐（如 `list`/`records`、`page`/`pageNum` 的差异已在封装层归一化）。
- 通知 WebSocket 走 `/ws` 代理；Next.js `rewrites` 不代理 WebSocket 升级，实时通知在开发环境下可能不可用，其余功能不受影响。
