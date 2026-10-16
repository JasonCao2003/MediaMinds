# AGENTS.md — MediaMinds 项目约定

> 本文件是给 AI 助手（及协作者）的项目级约定，请在每个新会话开始时遵守。

---

## ⛔ 第一条：不要启动项目

**本项目由维护者自己调试运行。AI 助手只负责「改代码」，不得启动、重启、停止任何服务。**

### 禁止执行

- `deploy/start-all.sh`、`deploy/stop-all.sh`
- `docker start` / `docker compose up` / `docker run`（任何拉起容器的命令）
- `npm run dev` / `npm start` / `next dev` / `next start`
- 直接 `java -jar` 启动任何微服务
- 任何会绑定端口或常驻后台的命令（`setsid nohup ... &` 等）
- 任何写操作 SQL（`INSERT` / `UPDATE` / `DELETE` / `DROP` / `ALTER` / `CREATE`）

### 允许执行

- 编辑源码、配置、文档、SQL 脚本
- **编译与类型检查**（不启动服务）：
  - `mvn -pl <模块> compile` / `mvn -pl <模块> -DskipTests package`
  - `npx tsc --noEmit`（`MediaMinds_next/`）
  - `npx next build`（`MediaMinds_next/`）
- **只读查询**：
  - `docker exec mm-mysql mysql -uroot -p123456 -e "SELECT ..."`（仅 `SELECT` / `SHOW` / `DESC`）
  - 读取 `deploy/logs/*.log`
- git 操作（`git add` / `commit` / `push`）

> 需要运行时验证时，**把命令写给维护者**，由他自己执行。

---

## 项目速览

MediaMinds（媒体智库）—— 智能书影音管理系统。

| 目录 | 说明 |
| --- | --- |
| `MediaMinds_java/` | Spring Cloud 微服务后端（Maven 多模块） |
| `MediaMinds_next/` | Next.js 15 前端（App Router + MUI v6，Brutalism 双主题） |
| `deploy/` | 本地编排：docker-compose、mysql-init、启停脚本、日志与 pid |
| `CHANGELOG.md` | 变更日志（按 Keep a Changelog 格式） |

**技术栈**：Spring Boot 3.4.4 / Spring Cloud 2024.0.1、Eureka、Gateway、OpenFeign、JWT、MySQL 8、Redis、MinIO、MyBatis-Plus；Next.js 15 + TypeScript + Material UI v6 + Zustand + Axios；**LangChain4j 1.22 + DeepSeek**（智能入库 Agent）。

### 端口

| 服务 | 端口 | 服务 | 端口 |
| --- | --- | --- | --- |
| 网关 gateway | 8080 | **智能入库 agent** | **9011** |
| Eureka | 8761 | 前端 Next.js | 5173 |
| 认证 auth | 9003 | MySQL | 3306 |
| 音乐 music | 9005 | Redis | 6379 |
| 图书 book | 9006 | MinIO | 9000 / 9101 |
| 影视 video | 9007 | | |

> 已移除：`document-service`(9009)、`notification-service`(9001)、`config-service`(8888)、`flask-service`(9010)、人脸识别登录、Kafka(9092)、Zookeeper(2181)。

### 数据库（容器 `mm-mysql`，root/123456）

`user_db`、`book_db`、`music_data`、`video_db`

> 时长统计落在 `user_db.user_activity`（用户 × 日期 × 媒体类型，每次上报累加）；
> AI 年度报告落在 `user_db.user_annual_report`（用户 × 年份唯一，重新生成覆盖）。
>
> 「最近观看」列表用 **localStorage**（`MediaMinds_next/src/lib/recent.ts`）而非数据库——
> 图书与音乐后端都没有阅读 / 播放记录表，只有影视有 `video_db.user_video_interaction`。

> 中文输出需加 `--default-character-set=utf8mb4`，否则显示 `????`。

### 测试账号

`caozhexuanadmin` / `123456`

---

## 关键设计约定（改代码时不要破坏）

1. **单角色模式**：不存在 admin/user 区分。已移除 `@RoleCheck` 注解类与全部注解、`X-Role` 透传、JWT 的 `role` claim、`user` 表的 `role` 列；前端无 `/admin` 路由组与角色判断，也不再保留内容管理页。**新增接口不要再加权限注解或角色字段。**
2. **媒体本体不入库**：视频 / 音乐 / 图书文件不入库，只存元数据，用户可自行上传。
3. **数据源标注 `source`**：酷狗音乐、TMDB、豆瓣、Project Gutenberg。
4. **Agent 降级链路**：`agent-service` 未配置 `DEEPSEEK_API_KEY` 或大模型调用失败时，自动回退规则式解析（`IntentParser`）。改动时保留这条兜底，保证服务始终可用。
5. **前端视觉规范：Brutalism（粗野主义）双主题**（浅色 / 深色，右上角切换，cookie 持久化）。铁律：**圆角一律 0px**、**不用模糊阴影**（层次只由 3px 实心描边表达）、**不加过渡动画**、**不用渐变**；颜色一律走 `var(--mm-*)` 令牌，页面内不手写十六进制色值；标题由 `AppShell` 统一渲染，**不要再用 `PageHeader`**。字体 Space Grotesk（中文回落系统黑体）。**改前端前必读 `MediaMinds_next/DESIGN.md`**。
6. **密钥不进仓库**：`deploy/.env.local`（TMDB / DeepSeek）已被 `.gitignore` 忽略。不要把它写进任何提交内容或文档示例。

---

## 已知坑（避免重复踩）

1. **`pkill -f "<服务名>"` 会误杀自己的 shell**——模式会匹配到当前命令行。用 `deploy/pids/*.pid` 或 `ss -ltnp | grep :端口` 定位 PID。
2. **网关 `503 Unable to find instance for xxx-service`**：单独重启微服务后网关负载均衡缓存陈旧，需重启 `gateway-service`。
3. **`music-service` 冷启动极慢**（130–250 秒），不是卡死。
4. **`media_type` 主键**：MyBatis-Plus 全局 `id-type` 必须为 `auto`（历史 bug：`ASSIGN_ID` 导致 int 主键溢出）。
5. **`components/NotificationProvider.tsx` 不是「通知服务」组件**——它是 `lib/notify.ts` 全局 toast 的渲染宿主（axios 拦截器与各页面的 `toast.*` 都靠它），**不要误删**。
6. **所有服务不依赖配置中心**：已移除 `config-service` 与 `spring-cloud-starter-config`，配置全部来自各服务本地 `application.yml`。
7. **Maven 增量编译 × Lombok 会产出坏字节码**（已根治，但要知道它长什么样）：
   症状是服务**启动即崩**，报
   `java.lang.ClassFormatError: Invalid method Code length 0 in class file com/xupt/xxx/DTO/Yyy`，
   而 `start-all.sh` 那边只表现为「等待端口超时」，很容易误判成启动慢。
   只有**部分**带 `@Data` 的类会坏（本次是 9 个：agent-service 5 个、gateway-service 1 个、demo-service 3 个），
   且只在 `mvn install`（不带 `clean`）之后出现。
   - **根治手段**：父 pom 的 `maven-compiler-plugin` 已设 `<useIncrementalCompilation>false</useIncrementalCompilation>`
     并显式声明 `annotationProcessorPaths`；`deploy/rebuild.sh` 后端**默认 `clean install`**。
   - **排查手段**：`java deploy/tools/CheckClassFiles.java MediaMinds_java/*/target/classes`
     （用真实类加载器逐个加载。**比对 md5 / jar 与 target/classes 是否一致没有意义**，那只能证明「一致地坏」。）
   - **绝对不要**用 `bash deploy/rebuild.sh backend --incremental` 来排查此类问题。

---

## 常用命令

```bash
# 重新编译（后端 + 前端，只构建不启动）
bash deploy/rebuild.sh                     # 后端默认 clean install + 类文件完整性自检
bash deploy/rebuild.sh backend             # 仅后端
bash deploy/rebuild.sh frontend            # 仅前端
bash deploy/rebuild.sh --typecheck-only    # 后端构建 + 前端仅类型检查
bash deploy/rebuild.sh backend --incremental   # ⚠ 跳过 clean，可能产出坏字节码，别用

# 类文件完整性自检（排查 ClassFormatError / 启动即崩）
java deploy/tools/CheckClassFiles.java MediaMinds_java/*/target/classes

# 后端编译（单模块）—— 手动执行时务必带 clean，理由见「已知坑 7」
cd MediaMinds_java && mvn -pl agent-service -DskipTests clean package

# 后端全量构建
cd MediaMinds_java && mvn -DskipTests clean install

# 前端类型检查 / 生产构建
cd MediaMinds_next && npx tsc --noEmit
cd MediaMinds_next && npx next build

# 只读查询数据库
docker exec mm-mysql mysql --default-character-set=utf8mb4 -uroot -p123456 -e "SELECT COUNT(*) FROM book_db.book;" book_db

# 查看日志（只读）
tail -n 100 deploy/logs/agent-service.log
```
