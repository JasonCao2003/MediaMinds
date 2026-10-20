# AGENTS.md — MediaMinds 项目约定

> 给 AI 助手（及协作者）的项目级约定，每个新会话先读。
> 改前端前另读 `MediaMinds_next/DESIGN.md`；改图书文件入库前另读 `docs/BOOK_FILE_IMPORT.md`。

---

## ⛔ 第一条：不要启动项目

**本项目由维护者自己调试运行。AI 助手只负责「改代码」，不得启动、重启、停止任何服务。**

### 禁止执行

- `deploy/start-all.sh`、`deploy/stop-all.sh`
- `docker start` / `docker compose up` / `docker run`（任何拉起容器的命令）
- `npm run dev` / `npm start` / `next dev` / `next start`
- 直接 `java -jar` 启动任何微服务
- 任何会绑定端口或常驻后台的命令（`setsid nohup ... &` 等）
- 任何写操作 SQL（`INSERT` / `UPDATE` / `DELETE` / `DROP` / `ALTER` / `CREATE`），包括 `deploy/migrations/*.sql`

### 允许执行

- 编辑源码、配置、文档、SQL 脚本
- 编译与类型检查（不启动服务）：`mvn ... compile/package`、`npx tsc --noEmit`、`npm run build`
- 只读查询：`docker exec mm-mysql mysql ... -e "SELECT ..."`（仅 `SELECT` / `SHOW` / `DESC`）
- 读取 `deploy/logs/*.log`
- git 操作（`git add` / `commit` / `push`）

> 需要运行时验证时，**把命令写给维护者**，由他自己执行。

---

## 项目边界与验证方式

| 目录 | 说明 |
| --- | --- |
| `MediaMinds_java/` | Spring Cloud 微服务后端（Maven 多模块） |
| `MediaMinds_next/` | Next.js 15 前端（App Router + MUI v6，Brutalism 双主题） |
| `deploy/` | 本地编排：docker-compose、mysql-init、迁移、启停脚本、日志与 pid |
| `MediaMinds_py/` | 只有 Notebook 与样例文本（歌词识别 / 章节划分等实验），**未接入任何服务**，不要当运行模块 |
| `docs/` | 功能交接文档（目前是图书文件入库） |

- 实际运行的后端只有：`discovery`、`gateway`、`auth`、`music`、`book`、`video`、`agent`。
- `demo-service`（9002）是遗留示例：父 pom 会编译它，但它**不在** `start-all.sh`、网关路由和前端中，不要把它当业务模块扩展。
- `music-service`、`demo-service` 的 Java 包名是 `com.xupt.book`（历史复制），不是 `com.xupt.music`。
- `README.md` / `PROJECT_DESCRIPTION.md` 仍有「用户注册」等旧描述，与当前代码冲突时以本文件与代码为准。
- **当前没有自动化测试，也没有 CI**（`src/test` 为空，`.github/` 只有一条 `.gitignore`）。不要假设存在单测，验证靠编译、类型检查和构建。
- 前端没有提交 ESLint / Prettier 配置，`npm run lint`（`next lint`）不是可靠门禁；以 `npx tsc --noEmit` + `npm run build` 为准。

### 端口

| 服务 | 端口 | 服务 | 端口 |
| --- | --- | --- | --- |
| 网关 gateway | 8080 | **智能入库 agent** | **9011** |
| Eureka | 8761 | 前端 Next.js | 5173 |
| 认证 auth | 9003 | MySQL | 3306 |
| 音乐 music | 9005 | Redis | 6379 |
| 图书 book | 9006 | MinIO | 9000 / 9101 |
| 影视 video | 9007 | | |

> 已移除：`document-service`、`notification-service`、`config-service`、`flask-service`、人脸识别登录、Kafka、Zookeeper。

### 数据库

库：`user_db`、`book_db`、`music_data`、`video_db`（容器 `mm-mysql`，root/123456）。测试账号 `caozhexuanadmin` / `123456`。

- 中文输出必须加 `--default-character-set=utf8mb4`，否则显示 `????`。
- `deploy/mysql-init/` 只在 MySQL **数据卷为空**时自动导入；已有库的结构变更要写成 `deploy/migrations/` 下的脚本，**由维护者手工执行**。
- 时长统计在 `user_db.user_activity`（用户 × 日期 × 媒体类型，累加）；AI 年度报告在 `user_db.user_annual_report`（用户 × 年份唯一，重新生成覆盖）。
- 「最近观看 / 最近播放」是 **localStorage** 快照（`MediaMinds_next/src/lib/recent.ts`），不是数据库；只有影视有 `video_db.user_video_interaction` 观看记录表。

---

## 常用命令

```bash
# 一步验证（后端默认 clean install + 类文件完整性自检；前端 tsc + next build）
bash deploy/rebuild.sh
bash deploy/rebuild.sh backend              # 仅后端
bash deploy/rebuild.sh frontend             # 仅前端
bash deploy/rebuild.sh --typecheck-only     # 后端构建 + 前端仅 tsc（注意：仍会构建后端）

# 最快的前端验证
cd MediaMinds_next && npx tsc --noEmit

# 单模块后端编译 —— 手动执行务必带 clean，理由见「已知坑」
cd MediaMinds_java && mvn -pl agent-service -DskipTests clean package

# 后端全量构建
cd MediaMinds_java && mvn -DskipTests clean install

# 类文件完整性自检（排查 ClassFormatError / 启动即崩）
java deploy/tools/CheckClassFiles.java MediaMinds_java/*/target/classes

# 只读查询数据库
docker exec mm-mysql mysql --default-character-set=utf8mb4 -uroot -p123456 \
  -e "SELECT COUNT(*) FROM book_db.book;" book_db

# 查看日志（只读）
tail -n 100 deploy/logs/agent-service.log
```

`deploy/rebuild.sh backend --incremental` 会跳过 `clean`，**不要用它排查构建问题**（见已知坑）。

---

## 后端约定

- **网关按路径前缀路由**：`/v1/auth/**`、`/v1/music/**`、`/v1/book/**`、`/v1/video/**`、`/v1/agent/**`。新增服务时必须同时改 `gateway-service/src/main/resources/application.yml`。
- **JWT 白名单是精确前缀列表**：`JWTFilter.EXCLUDED_PATHS` 只有登录相关端点。新增公开接口（如登录、验证码）要同步改这里，否则会被 401。
- 网关校验 JWT 后注入 `X-UserId` / `X-UserName`，`auth/book/music/video` 的 `Filter/Interceptor` 再放进 `ThreadLocal`。服务端口直连时这两个头可伪造，不要依赖「直连也鉴权」。`agent-service` 的 `FeignConfig` 会透传这两个头与 `Authorization`，新增 Feign 调用别丢用户上下文。
- **单角色模式**：没有 admin/user 区分，没有 `@RoleCheck`、`X-Role`、JWT `role` claim、`user.role` 列。**新增接口不要再加权限注解或角色字段。**
- **不要恢复自助注册**：个人媒体库，登录页已移除注册入口，账号在部署时预置；`/v1/auth/user/add` 是用户管理接口，不是注册。
- **媒体本体不入库**：视频 / 音乐 / 图书文件放 MinIO（默认 bucket `mediaminds`，可用 `MINIO_BUCKET` 覆盖），表里只存元数据 / 对象路径。
- **数据源标注 `source`**：酷狗音乐、TMDB、豆瓣、Google Books、OpenLibrary、Project Gutenberg、BookDrop。
- **Agent 降级链路**：`agent-service` 未配置 `DEEPSEEK_API_KEY` 或大模型调用失败时，回退到规则式 `IntentParser`。改 Agent 时必须保留这条兜底，保证服务始终可用。
- **MyBatis-Plus 主键策略必须和表结构匹配**：`book` / `music` / `video` 是 `int AUTO_INCREMENT`，配置 `id-type: auto`；`auth` / `demo` 用 `ASSIGN_ID`。不要把自增 int 表改成 `ASSIGN_ID`（雪花 ID 有 19 位，会撑爆 int 主键）。
- **配置全部来自各服务本地 `application.yml`**：没有配置中心，也没有 `spring-cloud-starter-config`。改环境变量后必须重启对应服务（Spring 启动时解析 `${...}`）。
- **上传限制**：`book-service` / `music-service` 已配 `spring.servlet.multipart`（单文件 200MB）。新服务要传文件时记得补，否则 1MB 就 413。
- **图书文件链路**：`book-service` 先落本地暂存区并抽元数据（**此时不落库、不进 MinIO**），用户确认后才转存；支持 EPUB / PDF / CBZ（MOBI / AZW3 明确不做）。暂存与缓存根目录由 `BOOK_FILE_DIR` 指定，`start-all.sh` 会导出为绝对路径 `deploy/data/book`；手动 `java -jar` 未设置时会回落到系统临时目录。

---

## 前端约定

- **视觉铁律**（详见 `DESIGN.md`）：圆角一律 `0px`；不用模糊阴影（层次只由 3px 实心描边 / 硬偏移块表达）；不加过渡动画；不用渐变；颜色一律走 `var(--mm-*)` 或 `useTheme().mm`，页面内不手写十六进制色值。
- 标题由 `AppShell` 统一渲染，**`PageHeader` 已废弃**。新增页面要在 `components/layout/UserLayout.tsx` 的 `META` 表登记标题；未登记的路由（如 `/content/movie/*`）会回落到「MediaMinds」。
- 图标一律用 MUI SVG 图标，不用 emoji；点击目标 ≥ 44×44px；不要 `outline: none`；正文对比度 ≥ 4.5:1。
- **请求统一走 `lib/request.ts`**，baseURL 是 `/api`，由 `next.config.mjs` 的 rewrite 转到网关 8080；MinIO 走 `/oss` → `mediaminds` bucket。不要在页面里写死 `http://localhost:8080`。
- Axios 拦截器注入的 `Authorization` 是 **token 原文，没有 `Bearer ` 前缀**（网关两种都接受）；401 会自动清登录态并跳登录页。非标准响应（Blob / 直链）会直接透传。
- 登录态与用户信息持久化在 localStorage（Zustand persist，key `mediaminds-auth`）；最近列表是 `mm-recent`；阅读进度另有本地记录。
- `components/NotificationProvider.tsx` 不是「通知服务」，而是 `lib/notify.ts` 全局 toast 的渲染宿主（axios 拦截器与各页面 `toast.*` 都靠它），**不要误删**。

---

## 已知坑

1. **`pkill -f "<服务名>"` 会误杀自己的 shell**——模式会匹配到当前命令行。用 `deploy/pids/*.pid` 或 `ss -ltnp | grep :端口` 定位 PID。
2. **网关 `503 Unable to find instance for xxx-service`**：单独重启微服务后网关负载均衡缓存陈旧，需重启 `gateway-service`。
3. **`music-service` 冷启动极慢**（130–250 秒），不是卡死。
4. **Maven 增量编译 × Lombok 会产出坏字节码**（已根治，但要知道它长什么样）：
   症状是服务**启动即崩**，报
   `java.lang.ClassFormatError: Invalid method Code length 0 in class file com/xupt/xxx/DTO/Yyy`，
   `start-all.sh` 那边只表现为「等待端口超时」，容易误判成启动慢。只有**部分**带 `@Data` 的类会坏，且只在 `mvn install`（不带 `clean`）之后出现。
   - 父 pom 已设 `<useIncrementalCompilation>false</useIncrementalCompilation>` 并显式声明 `annotationProcessorPaths`；`deploy/rebuild.sh` 后端默认 `clean install`。
   - 排查用 `java deploy/tools/CheckClassFiles.java MediaMinds_java/*/target/classes`（用真实类加载器逐个加载）。
   - **比对 md5 / jar 与 target/classes 是否一致没有意义**，那只能证明「一致地坏」。

---

## 密钥与运行态

- `deploy/.env.local` 已被 `.gitignore` 忽略，`start-all.sh` 启动前自动 `source`。常用变量：`TMDB_ACCESS_TOKEN` / `TMDB_API_KEY`、`DEEPSEEK_API_KEY`、`GOOGLE_BOOKS_API_KEY`、`KUGOU_TOKEN` 等。
- **不要把 `.env.local` 的内容写进代码、提交、文档示例或对话输出**；也不要把它复制到其他路径。
- `deploy/pids/`、`deploy/logs/`、`deploy/data/`（含上传的图书文件、BookDrop 投递目录）都是运行态，已忽略，不要提交。
- 各服务 `application.yml` 里已有本地数据库 / 邮箱等默认凭据；不要把新增密钥硬编码进去，优先用环境变量。
