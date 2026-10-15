# MediaMinds 部署与启动

本目录提供本地一键启动 MediaMinds 全栈所需的编排与脚本。

## 组件与端口

| 组件 | 容器 / 进程 | 端口 | 凭据 |
| --- | --- | --- | --- |
| MySQL 8 | `mm-mysql` | 3306 | root / 123456 |
| Redis 7 | `mm-redis` | 6379 | 无密码 |
| MinIO | `mm-minio` | 9000（API）/ 9101（控制台） | minioadmin / minioadmin |
| Zookeeper | `mm-zookeeper` | 2181 | — |
| Kafka | `mm-kafka` | 9092 | — |

微服务与前端端口见根目录 `README.md`：Eureka 8761、网关 8080、auth 9003、music 9005、book 9006、video 9007、agent 9011、document 9009、notification 9001、flask 9010，Next.js 前端 5173。

## 一键启动

```bash
# 1) 构建后端（首次或代码变更后）
cd MediaMinds_java && mvn -DskipTests clean install

# 2) 启动全部（基础设施 + 微服务 + 前端）
bash ../deploy/start-all.sh
```

脚本会：启动 `mm-*` 容器 → 等待 MySQL/Redis/MinIO/Kafka → 启动 Eureka → 依次启动业务微服务 → 启动网关 → 启动 Next.js(5173) 前端。

## 停止

```bash
bash deploy/stop-all.sh              # 仅停止应用服务，保留 Docker 基础设施
bash deploy/stop-all.sh --with-infra # 连同 Docker 容器一起停止
```

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
```

配置后 `video-service` 即可使用 `/v1/video/tmdb/*` 搜索与导入影视。

## 外部数据源入库

后端已内置三个数据源接入（均需管理员权限）：

| 来源 | 端点 | 说明 |
| --- | --- | --- |
| 酷狗音乐 | `POST /v1/music/kugou/import` | 写入 `song`/`singer`，含歌词；直链需 VIP |
| 豆瓣图书 | `POST /v1/book/douban/import?id=` | 写入 `book`（仅元信息：书名/作者/封面/简介/出版信息） |
| Project Gutenberg | `POST /v1/book/gutenberg/import?id=` | 旧书源（保留），写入 `book`/`book_chapter` |
| TMDB | `POST /v1/video/tmdb/import/batch` | 写入 `movie`，自动建分类/标签并关联，海报入 MinIO |
| 智能 Agent | `POST /v1/agent/query` / `POST /v1/agent/import` | 自然语言聚合检索（酷狗 / TMDB / 豆瓣），结构化候选后批量入库元数据 |

## 说明

- 业务服务已内置本地配置（`spring.cloud.config.enabled=false`），可不依赖 `config-service` 运行；`config-service` 会克隆远程配置仓库，需要外网。
- `flask-service` 的人脸识别依赖本机 `http://localhost:5000` 的 Python 服务（当前仓库仅有 notebook，未提供 Flask 服务），因此人脸登录暂不可用，其余功能不受影响。
- 日志位于 `deploy/logs/`，进程 PID 位于 `deploy/pids/`。
