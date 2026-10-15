# MediaMinds 项目描述

## 一、仓库简介（用于 GitHub "About" 一句话）

> 基于 Spring Cloud 微服务 + Next.js + Python AI 的智能书影音管理系统，集成讯飞星火大模型、Whisper 语音识别与 InsightFace 人脸识别，提供书籍、音乐、视频、文档的一站式管理。

**Topics 建议：** `spring-cloud` `nextjs` `material-ui` `microservices` `spring-boot` `insightface` `whisper` `agent` `minio` `graduation-project`

---

## 二、项目简介

MediaMinds（智能书影音管理系统）是一个面向海量媒体内容的前后端分离平台，旨在解决传统媒体资源管理系统**扩展性差、功能单一、智能化程度低**等问题。

系统采用 Spring Cloud 微服务架构，将业务拆分为用户认证、书籍、音乐、视频、文档、智能分析等多个独立服务；前端基于 Next.js 15 + Material UI 构建响应式界面；后端通过 Python 服务集成人工智能能力，实现内容理解、情感分析、语音识别与人脸登录，为用户提供统一的书影音资源管理与智能分析服务。

本项目同时是配套的本科毕业设计论文实现，论文正文见仓库根目录 [`PAPER.md`](./PAPER.md)，项目说明见 [`README.md`](./README.md)。

---

## 三、技术栈

| 层次 | 技术选型 |
| --- | --- |
| 微服务框架 | Spring Boot 3.4.4、Spring Cloud 2024.0.1 |
| 服务治理 | Eureka（注册发现）、Spring Cloud Gateway（网关）、Spring Cloud Config（配置中心） |
| 服务通信 | OpenFeign、RESTful API、Kafka（异步消息） |
| 安全认证 | Spring Security、JWT、自定义 `@RoleCheck` 注解、RBAC |
| 前端 | Next.js 15（App Router）、TypeScript、Material UI v6（Material Design 3）、Zustand、Axios、ECharts |
| 持久化 | MySQL 8.x、Redis 6.x（缓存）、MyBatis-Plus |
| 对象存储 | MinIO |
| 实时通信 | WebSocket / STOMP |
| 人工智能（Python） | 讯飞星火大模型、OpenAI Whisper（语音识别）、InsightFace / ArcFace（人脸识别） |
| 运行环境 | JDK 17、Node.js 18+、Python 3.x |

---

## 四、核心功能

- **用户服务**：账号密码登录、邮箱验证码登录、人脸识别登录；用户注册、信息维护、头像上传、角色与权限管理。
- **书籍服务**：书籍/章节 CRUD、封面与正文上传（MinIO）、Python 自动章节划分、在线阅读器（多主题、字体调节、断点续读）、内容分析（摘要/人物关系/主题）。
- **音乐服务**：歌曲与歌手管理、歌单管理、歌词编辑、在线播放器与歌词同步、Whisper 歌词自动生成与时间戳、歌词情感分析。
- **视频服务**：影片与分类/标签管理、视频上传与在线播放、播放进度记忆、评论、点赞与收藏。
- **文档服务**：文档上传与管理、树形文件夹、版本控制与回溯、多格式在线预览。
- **智能分析服务**：封装讯飞星火大模型，提供书籍、歌词、文档的内容分析与通用对话能力，配合 Redis 缓存与 Kafka 异步处理。

---

## 五、系统架构与模块

系统整体分为四层：**前端层 → 网关层 → 服务层 → 数据层**。

Java 微服务模块（`MediaMinds_java/`）：

| 模块 | 职责 | 端口（参考） |
| --- | --- | --- |
| `discovery-service` | Eureka 服务注册与发现 | 8761 |
| `config-service` | Spring Cloud Config 配置中心 | 8888 |
| `gateway-service` | API 网关、统一路由与鉴权 | 8080 |
| `auth-service` | 认证授权与用户管理 | 9000 |
| `music-service` | 音乐管理 | 9005 |
| `book-service` | 书籍管理 | 9006 |
| `video-service` | 视频管理 | 由配置中心分配 |
| `document-service` | 文档管理 | 9009 |
| `notification-service` | 异步通知 | 由配置中心分配 |
| `agent-service` | 智能入库 Agent（自然语言 → 聚合检索 → 批量入库元数据） | 9011 |
| `flask-service` | Java 与 Python AI 服务桥接 | 9010 |
| `demo-service` | 示例服务 | 9002 |

> 注：部分服务的端口与数据源由远程配置仓库（Spring Cloud Config）集中管理，以配置中心返回值为准。

---

## 六、目录结构

```
MediaMinds/
├── README.md                # 毕业设计论文全文
├── PROJECT_DESCRIPTION.md   # 本文件：项目描述
├── CHANGELOG.md             # 更新日志
├── .gitignore
├── assets/                  # 论文插图
├── MediaMinds_java/         # Spring Cloud 微服务后端
│   ├── pom.xml              # Maven 聚合父工程
│   ├── discovery-service/   # 服务注册与发现
│   ├── config-service/      # 配置中心
│   ├── gateway-service/     # API 网关
│   ├── auth-service/        # 认证授权
│   ├── book-service/        # 书籍服务
│   ├── music-service/       # 音乐服务
│   ├── video-service/       # 视频服务
│   ├── document-service/    # 文档服务
│   ├── agent-service/       # 智能入库 Agent
│   ├── notification-service/# 通知服务
│   └── flask-service/       # Python AI 服务桥接
├── MediaMinds_next/         # Next.js 15 + Material UI 前端
│   ├── src/app/             # App Router 页面
│   ├── src/api/             # 接口封装
│   ├── src/components/      # 布局与通用组件
│   ├── src/lib/             # 请求 / WebSocket / 主题
│   ├── src/stores/          # Zustand 状态管理
│   └── next.config.mjs      # 开发代理配置
└── MediaMinds_py/           # Python AI 实验与脚本
    ├── FaceIdentity.ipynb       # 人脸识别
    ├── lyric_recognizer.ipynb   # 歌词识别（Whisper）
    ├── novel_splitter.ipynb     # 书籍章节划分
    └── ...
```

---

## 七、快速开始

### 1. 后端（Java 微服务）

```bash
cd MediaMinds_java
# 需先启动 MySQL、Redis、Kafka，并启动 config-service / discovery-service
mvn clean install
# 按依赖顺序启动各微服务（先 discovery、config，再 gateway 与业务服务）
```

### 2. 前端（Next.js）

```bash
cd MediaMinds_next
npm install
npm run dev     # 默认 http://localhost:5173
```

### 3. Python AI 服务

```bash
# 安装依赖后运行 Notebook，或将其封装为 Flask 服务
# 依赖：openai-whisper、insightface、onnxruntime 等
```

> 运行前请根据本地环境修改各服务 `src/main/resources/application.yml` 中的数据源、Redis、Kafka、MinIO 与各类 API Key 配置。

---

## 八、作者与许可

- 作者：JasonCao（[JasonCao2003](https://github.com/JasonCao2003)）
- 仓库：<https://github.com/JasonCao2003/MediaMinds>
- 许可：Apache-2.0
