# 更新日志 (Changelog)

本项目的所有重要更新都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 (Semantic Versioning)](https://semver.org/lang/zh-CN/)。

更新类型分为：`Added`（新增）、`Changed`（变更）、`Fixed`（修复）、
`Removed`（移除）、`Deprecated`（弃用）、`Security`（安全）。

---

## [Unreleased]

### Changed
- 重写并完善项目 README，重整论文摘要、正文与参考文献结构。
- 移除 README 中冗余的目录（TOC）内容，精简文档长度。

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
- `book-service`：书籍与章节管理、封面/正文上传至阿里云 OSS、Python 自动章节划分、在线阅读器（多主题、字体调节、断点续读）。
- `music-service`：歌曲/歌手/歌单管理、歌词编辑、在线播放器与歌词同步。
- `video-service`：影片、分类、标签管理，在线播放、进度记忆、评论、点赞与收藏。
- `document-service`：文档上传管理、树形文件夹、版本控制与回溯、多格式在线预览。
- `notification-service`：基于 WebSocket/STOMP 的实时消息通知。

**人工智能集成**
- `spark-service`：集成讯飞星火大模型，提供书籍摘要/人物关系/主题分析、歌词情感分析、文档摘要与关键词提取、通用对话，配合 Redis 缓存与 Kafka 异步处理。
- `flask-service`：Java 微服务与 Python AI 模块之间的桥接服务。
- Python 模块：OpenAI Whisper 歌词识别与时间戳标注、InsightFace/ArcFace 人脸识别、书籍章节自动分割。

**推荐系统**
- 基于用户与基于物品的协同过滤（皮尔逊相关系数）。
- 基于内容的推荐与混合推荐策略。
- 面向新用户的冷启动处理（热门内容推荐）。

**前端**
- 基于 Vue 3 + Vue Router + Pinia + Axios 的响应式单页应用。
- Element Plus + ECharts 后台界面，拟物化风格前台界面。
- 书籍阅读器、音乐播放器、视频播放器、文档管理器等业务组件。

**数据与存储**
- MySQL 8.x 结构化存储（各服务独立库），MyBatis-Plus 持久化。
- Redis 缓存（登录态、推荐结果、大模型分析结果）。
- 阿里云 OSS 统一存储媒体资源，采用冷热分离策略。

---

[Unreleased]: https://github.com/JasonCao2003/MediaMinds/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/JasonCao2003/MediaMinds/releases/tag/v1.0.0
