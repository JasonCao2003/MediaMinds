# MediaMinds 部署与启动

本目录提供本地一键启动 MediaMinds 全栈所需的编排与脚本。

## 组件与端口

| 组件 | 容器 / 进程 | 端口 | 凭据 |
| --- | --- | --- | --- |
| MySQL 8 | `mm-mysql` | 3306 | root / 123456 |
| Redis 7 | `mm-redis` | 6379 | 无密码 |
| MinIO | `mm-minio` | 9000（API）/ 9101（控制台） | minioadmin / minioadmin |

微服务与前端端口见根目录 `README.md`：Eureka 8761、网关 8080、auth 9003、music 9005、book 9006、video 9007、agent 9011，Next.js 前端 5173。

## 一键启动

```bash
# 1) 构建后端（首次或代码变更后）
cd MediaMinds_java && mvn -DskipTests clean install

# 2) 启动全部（基础设施 + 微服务 + 前端）
bash ../deploy/start-all.sh
```

脚本会：启动 `mm-*` 容器 → 等待 MySQL/Redis/MinIO → 启动 Eureka → 依次启动业务微服务 → 启动网关 → 启动 Next.js(5173) 前端。

## 停止

```bash
bash deploy/stop-all.sh              # 仅停止应用服务，保留 Docker 基础设施
bash deploy/stop-all.sh --with-infra # 连同 Docker 容器一起停止
```

## 重新编译

代码变更后重新构建（**只构建，不启动任何服务**）：

```bash
bash deploy/rebuild.sh                     # 后端 + 前端
bash deploy/rebuild.sh backend             # 仅后端（mvn -DskipTests install）
bash deploy/rebuild.sh frontend            # 仅前端（tsc + npm run build）
bash deploy/rebuild.sh backend --clean     # 先 clean 再构建
bash deploy/rebuild.sh --typecheck-only    # 后端构建 + 前端仅类型检查
```

脚本会先做环境检查（Java / Maven / Node / npm），随后逐个构建并汇总耗时；
前端缺 `node_modules` 时会自动 `npm install`。
构建产物就绪后由你自行重启：`bash deploy/stop-all.sh && bash deploy/start-all.sh`。

> `start-all.sh` 启动前端时同样使用 **生产模式**（`npm run build && npm start`），
> 首次启动需要等待构建完成（约 1-2 分钟）。开发调试如需 HMR，可手动改用 `npm run dev`。

## 数据库初始化

`mysql-init/` 内的 SQL 已由各服务 `src/main/resources/*.sql` 补齐 `CREATE DATABASE` 后生成，供 MySQL 容器首次初始化自动导入。若容器已有数据卷则不会重新执行。

手动导入示例：

```bash
docker exec -i mm-mysql mysql -uroot -p123456 < deploy/mysql-init/01_user_db.sql
```

## 环境变量（`deploy/.env.local`）

`start-all.sh` 启动前会自动 `source deploy/.env.local`（该文件已被 `.gitignore` 忽略）。用于配置外部数据源的密钥：

```bash
export TMDB_ACCESS_TOKEN="<TMDB v4 Read Access Token>"
export TMDB_API_KEY="<TMDB v3 API Key>"        # 与上一项二选一
export KUGOU_TOKEN=""                           # 可选：酷狗登录态，用于解析 VIP 曲目直链
export DEEPSEEK_API_KEY="sk-xxxxxx"             # 智能入库 Agent 的大模型 Key（LangChain4j）
```

配置后 `video-service` 即可使用 `/v1/video/tmdb/*` 搜索与导入影视。

`agent-service` 的大模型配置（可用环境变量覆盖）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 空 | 未配置时 Agent 自动降级为规则式解析 |
| `AGENT_LLM_ENABLED` | `true` | 是否启用大模型 |
| `AGENT_LLM_BASE_URL` | `https://api.deepseek.com/v1` | OpenAI 兼容端点（可换成通义千问 / Moonshot / Ollama） |
| `AGENT_LLM_MODEL` | `deepseek-chat` | 模型名 |

## 外部数据源入库

后端已内置三个数据源接入：

| 来源 | 端点 | 说明 |
| --- | --- | --- |
| 酷狗音乐 | `POST /v1/music/kugou/import` | 写入 `song`/`singer`，含歌词；直链需 VIP |
| 豆瓣图书 | `POST /v1/book/douban/import?id=` | 写入 `book`（仅元信息：书名/作者/封面/简介/出版信息） |
| TMDB | `POST /v1/video/tmdb/import/batch` | 写入 `movie`，自动建分类/标签并关联，海报入 MinIO |
| 智能 Agent | `POST /v1/agent/chat`（多轮）/ `POST /v1/agent/query` / `POST /v1/agent/import` | 基于 **LangChain4j + DeepSeek** 的工具调用智能体：大模型自主检索（酷狗 / TMDB / 豆瓣）、生成自然语言回复，并可按序号批量入库元数据 |

## 说明

- 各服务配置全部来自本地 `src/main/resources/application.yml`，不依赖配置中心。
- 登录方式为账号密码与邮箱验证码（人脸识别登录已移除）。
- 日志位于 `deploy/logs/`，进程 PID 位于 `deploy/pids/`。
