# 更新日志 (Changelog)

本项目的所有重要更新都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 (Semantic Versioning)](https://semver.org/lang/zh-CN/)。

更新类型分为：`Added`（新增）、`Changed`（变更）、`Fixed`（修复）、
`Removed`（移除）、`Deprecated`（弃用）、`Security`（安全）。

---

## [Unreleased]

### Added
- **Next.js 前端（`MediaMinds_next/`）**：基于 Next.js 15 App Router + TypeScript + Material UI v6（Material Design 3）全新前端，覆盖登录/注册、用户端与管理员端全部页面。
  - Material Design 3 主题体系（明暗双主题、品牌色令牌、统一动效与无障碍规范）。
  - Zustand 状态管理、Axios 请求层（拦截器/token/通知）、STOMP over SockJS 实时通知。
  - 管理端通用 CRUD 脚手架、ECharts 控制面板、文件上传与版本管理。
  - 与后端网关一致的 `/api`、`/oss`、`/ws` 开发代理。
- **本地部署编排（`deploy/`）**：`docker-compose.yml`（MySQL/Redis/MinIO/Zookeeper/Kafka）、`mysql-init/*.sql`、一键启停脚本 `start-all.sh` / `stop-all.sh` 与部署说明。
- **外部数据源接入**：复用后端已有集成，从 **酷狗音乐**（`/v1/music/kugou/import`）与 **Project Gutenberg**（`/v1/book/gutenberg/import`，经 Gutendex）批量拉取真实数据入库，`song`/`book`/`movie` 记录标注 `source` 来源。
- **智能入库 Agent（`agent-service`，端口 9011）**：新增自然语言入库服务。用户描述「我想要某个视频/图书/音乐」后，Agent 解析意图（类型 / 检索维度 / 关键词）→ 通过 OpenFeign 聚合调用酷狗、TMDB、Gutenberg 三个数据源 → 归一化为统一候选结构返回 → 用户勾选后批量入库元数据（媒体本体不入库，可自行上传）。支持按标题 / 歌手 / 作者 / 演员 / 导演检索。
- 前端新增「智能入库」页面（`/content/agent`）：对话式交互 + 候选卡片多选 + 批量入库。
- 影视数据源扩展：`/v1/video/tmdb/person/search` 与 `/v1/video/tmdb/person/movies`，支持按演员 / 导演检索影片。
- **豆瓣书源（`book-service`）**：新增 `/v1/book/douban/search`、`/v1/book/douban/{id}`、`/v1/book/douban/import`，抓取豆瓣图书搜索结果与 rexxar 详情接口，仅入库元信息（书名/作者/封面/简介/出版信息），不下载正文。Agent 的图书来源已切换为豆瓣。

### Changed
- 前端技术栈由 Vue 3 + Element Plus 迁移至 Next.js 15 + Material UI，端口统一为 5173。
- 前端视觉重构为「Midnight」深色设计系统：仅深色主题、近黑深蓝背景 + 大圆角悬浮外壳、浅紫强调色 `#7C7FF2`、低饱和卡片与颗粒质感；左侧导航改为纯图标轨道（悬停提示，管理端分组悬停弹出子菜单）。
- 全站字体更换为 **JetBrains Maple Mono**（经 ZSFT CDN 按 unicode-range 分片加载）。

### Removed
- 移除 `MediaMinds_vue/`（Vue 3 前端），功能已由 `MediaMinds_next/` 完整替代。
- 移除前端「文档管理」功能：用户端 `/content/document`、管理端 `/admin/document` 页面、导航入口、`api/document.ts` 及相关类型（后端 `document-service` 暂保留）。
- 移除 `spark-service`（讯飞星火大模型服务）及其网关路由与启动项；同步移除前端依赖它的「文章 AI 概要」（阅读器）与「歌词情感分析」（音乐页）功能。
- 移除独立的「酷狗音乐」页面（`/content/kugou`）与导航入口，改为合并进「音乐浏览」页的「酷狗搜索」标签页。
- **改为单用户模式**：移除全部角色校验（music/book/video/document/auth 服务的 `Interceptor` 不再校验 `@RoleCheck`），前端去掉 `admin` 路由守卫与角色跳转；用户数据精简为 1 个账号（`caozhexuanadmin`，role=`user`）。

### Fixed
- 修正 Next.js 主题阴影层级不足（`theme.shadows` 需 25 级）导致的 MUI `elevation` 报错。
- 修正请求层“重复请求取消”逻辑误取消并发相同请求的问题（影响管理端仪表盘统计）。
- 修正 `<button>` 嵌套 `<button>` 导致的 React hydration 错误（图书/视频卡片、文档文件夹项），并优化页面渲染性能。
- 视频页收藏状态由逐个影片查询（12 次请求）改为一次性拉取收藏列表；修正图书页收藏标记字段。
- 重写并完善项目 README，重整论文摘要、正文与参考文献结构。
- 移除 README 中冗余的目录（TOC）内容，精简文档长度。
- 修正 MyBatis-Plus 全局 `id-type` 由 `ASSIGN_ID`（雪花 ID）改为 `auto`，避免 `int` 主键溢出（`Data truncation: Out of range value for column 'id'`）导致外部数据源导入新建记录失败（music/book/video 服务）。
- 修正酷狗搜索结果歌曲名为空的问题：`normalizeSong` 补充 `OriSongName`/`FileName` 与 `MixSongID` 字段映射。
- 为微服务启动添加 `-Dnetworkaddress.cache.ttl=30`，避免长驻 JVM 缓存陈旧 DNS（fake-IP）导致外部书源请求超时。
- 修正 Gutenberg 正文下载：文本地址会 `HTTPS→HTTP` 降级重定向，`Redirect.NORMAL` 不跟随导致仅下载到 302 页面（正文 25 词）；改为 `Redirect.ALWAYS`，章节切分恢复正常（如《战争与和平》731 章）。
- 修正酷狗封面地址 `{size}` 占位符未替换导致图片 404（后端归一化 + 存量数据 SQL 修正）。
- 修正音乐页歌手名恒显示「未知歌手」：歌曲接口只返回 `singerId`，前端按歌手列表建立 id→name 映射补全。
- 修正 TMDB 导入缺失 `language`/`area` 字段导致 `movie` 表插入失败（`Field 'language' doesn't have a default value`）：按 TMDB `original_language`/`production_countries` 映射为本地语言/地区码。
- 修正影视海报不显示：影片接口字段为 `picture`，前端（视频列表/播放页/管理端）仅映射了 `pic`/`cover`，补上 `picture`。
- 修正酷狗音乐页客户端崩溃：搜索接口 `data` 为 `{ total, songs }` 而非数组、榜单接口为原始酷狗结构（`data.data.list` / `data.data.info` / `data.data.songlist`），前端改为按真实结构归一化（含 `audio_info.hash_128` 取 hash、`album_info.sizable_cover` 取封面）。

### Added
- 新增 `.gitignore`，覆盖 Java/Maven、Node/Vue、Python/Jupyter、IDE、系统与密钥文件。
- 新增 `PROJECT_DESCRIPTION.md`，补充面向开发者的项目简介、技术栈、模块划分与快速开始说明。
- 新增 `CHANGELOG.md`（本文件）。

### Fixed
- 修正 README 中图表编号、章节引用等排版问题。

---

## [1.0.0] - 2025-06-17

首个正式提交版本（Final Submission）。

### Added

**微服务基础架构**
- 基于 Spring Boot 3.4.4 与 Spring Cloud 2024.0.1 构建 Maven 聚合父工程。
- `discovery-service`：Eureka 服务注册与发现。
- `config-service`：Spring Cloud Config 集中配置中心，支持配置热刷新。
- `gateway-service`：Spring Cloud Gateway 统一入口，实现路由转发、JWT 鉴权、限流与负载均衡。
- 基础服务间通信：OpenFeign + RESTful API，Kafka 处理异步任务。

**用户与安全**
- `auth-service`：账号密码、邮箱验证码、人脸识别三种登录方式。
- 基于 Spring Security + JWT 的无状态认证，Token 存储于 Redis。
- 自定义 `@RoleCheck` 注解实现 RBAC 细粒度权限控制，密码采用 BCrypt 加密。

**核心业务服务**
- `book-service`：书籍与章节管理、封面/正文上传至MinIO、Python 自动章节划分、在线阅读器（多主题、字体调节、断点续读）。
- `music-service`：歌曲/歌手/歌单管理、歌词编辑、在线播放器与歌词同步。
- `video-service`：影片、分类、标签管理，在线播放、进度记忆、评论、点赞与收藏。
- `document-service`：文档上传管理、树形文件夹、版本控制与回溯、多格式在线预览。
- `notification-service`：基于 WebSocket/STOMP 的实时消息通知。

**人工智能集成**
- `spark-service`：集成讯飞星火大模型，提供书籍摘要/人物关系/主题分析、歌词情感分析、文档摘要与关键词提取、通用对话，配合 Redis 缓存与 Kafka 异步处理。
- `flask-service`：Java 微服务与 Python AI 模块之间的桥接服务。
- Python 模块：OpenAI Whisper 歌词识别与时间戳标注、InsightFace/ArcFace 人脸识别、书籍章节自动分割。

**前端**
- 基于 Vue 3 + Vue Router + Pinia + Axios 的响应式单页应用。
- Element Plus + ECharts 后台界面，拟物化风格前台界面。
- 书籍阅读器、音乐播放器、视频播放器、文档管理器等业务组件。

**数据与存储**
- MySQL 8.x 结构化存储（各服务独立库），MyBatis-Plus 持久化。
- Redis 缓存（登录态、大模型分析结果）。
- MinIO 统一存储媒体资源，采用冷热分离策略。

---

[Unreleased]: https://github.com/JasonCao2003/MediaMinds/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/JasonCao2003/MediaMinds/releases/tag/v1.0.0
