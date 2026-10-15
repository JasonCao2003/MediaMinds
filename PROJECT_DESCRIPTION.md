# MediaMinds 项目描述

## 一、仓库简介（用于 GitHub "About" 一句话）

> 基于 Spring Cloud 微服务 + Next.js + LangChain4j 智能体的智能书影音管理系统，集成 DeepSeek 大模型与 Whisper 语音识别，聚合酷狗音乐 / TMDB 影视 / 豆瓣图书数据源，提供书籍、音乐、视频的一站式管理与自然语言智能入库。

**Topics 建议：** `spring-cloud` `nextjs` `material-ui` `microservices` `spring-boot` `langchain4j` `deepseek` `agent` `whisper` `minio`

---

## 二、项目简介

MediaMinds（智能书影音管理系统）是一个面向海量媒体内容的前后端分离平台，旨在解决传统媒体资源管理系统**扩展性差、功能单一、智能化程度低**等问题。

系统采用 Spring Cloud 微服务架构，将业务拆分为用户认证、书籍、音乐、视频、智能入库 Agent 等多个独立服务；前端基于 Next.js 15 + Material UI 构建响应式界面；后端通过 LangChain4j 接入 DeepSeek 大模型实现自然语言检索与批量入库，并通过 Python 脚本提供语音识别与章节划分等能力，为用户提供统一的书影音资源管理与智能分析服务。

项目说明见 [`README.md`](./README.md)，详细描述见 [`PROJECT_DESCRIPTION.md`](./PROJECT_DESCRIPTION.md)。

---

## 三、技术栈

| 层次 | 技术选型 |
| --- | --- |
| 微服务框架 | Spring Boot 3.4.4、Spring Cloud 2024.0.1 |
| 服务治理 | Eureka（注册发现）、Spring Cloud Gateway（网关） |
| 服务通信 | OpenFeign、RESTful API |
| 安全认证 | Spring Security、JWT（单角色，无权限校验） |
| 前端 | Next.js 15（App Router）、TypeScript、Material UI v6（Material Design 3）、Zustand、Axios |
| 持久化 | MySQL 8.x、Redis 6.x（缓存）、MyBatis-Plus |
| 对象存储 | MinIO |
| 智能体（Java） | LangChain4j 1.22（工具调用 / 多轮记忆）、DeepSeek（OpenAI 兼容协议） |
| 人工智能（Python） | OpenAI Whisper（歌词识别）、书籍章节自动划分 |
| 运行环境 | JDK 17、Node.js 18+、Python 3.x |

---

## 四、核心功能

- **用户服务**：账号密码登录、邮箱验证码登录；用户注册、信息维护、头像上传（单角色，无权限区分）。
- **书籍服务**：书籍/章节 CRUD、封面与正文上传（MinIO）、Python 自动章节划分、在线阅读器（多主题、字体调节、断点续读）、内容分析（摘要/人物关系/主题）。
- **音乐服务**：歌曲与歌手管理、歌单管理、歌词编辑、在线播放器与歌词同步、Whisper 歌词自动生成与时间戳。
- **视频服务**：影片与分类/标签管理、视频上传与在线播放、播放进度记忆、评论、点赞与收藏。
- **智能入库 Agent**：基于 LangChain4j + DeepSeek 的工具调用智能体，用自然语言描述需求即可检索酷狗音乐 / TMDB 影视 / 豆瓣图书，大模型自主选择数据源并生成回复，支持多轮对话与按序号批量入库元数据（媒体本体不入库）。

---

## 五、系统架构与模块

系统整体分为四层：**前端层 → 网关层 → 服务层 → 数据层**。

Java 微服务模块（`MediaMinds_java/`）：

| 模块 | 职责 | 端口（参考） |
| --- | --- | --- |
| `discovery-service` | Eureka 服务注册与发现 | 8761 |
| `gateway-service` | API 网关、统一路由与鉴权 | 8080 |
| `auth-service` | 认证授权与用户管理 | 9003 |
| `music-service` | 音乐管理 | 9005 |
| `book-service` | 书籍管理 | 9006 |
| `video-service` | 视频管理 | 9007 |
| `agent-service` | 智能入库 Agent（LangChain4j + DeepSeek，自然语言 → 工具调用聚合检索 → 批量入库元数据） | 9011 |
| `demo-service` | 示例服务 | 9002 |


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
│   ├── gateway-service/     # API 网关
│   ├── auth-service/        # 认证授权
│   ├── book-service/        # 书籍服务
│   ├── music-service/       # 音乐服务
│   ├── video-service/       # 视频服务
│   ├── agent-service/       # 智能入库 Agent（LangChain4j + DeepSeek）
├── MediaMinds_next/         # Next.js 15 + Material UI 前端
│   ├── src/app/             # App Router 页面
│   ├── src/api/             # 接口封装
│   ├── src/components/      # 布局与通用组件
│   ├── src/lib/             # 请求 / 主题 / 全局提示
│   ├── src/stores/          # Zustand 状态管理
│   └── next.config.mjs      # 开发代理配置
└── MediaMinds_py/           # Python AI 实验与脚本
    ├── lyric_recognizer.ipynb   # 歌词识别（Whisper）
    ├── novel_splitter.ipynb     # 书籍章节划分
    └── ...
```

---

## 七、快速开始

### 1. 后端（Java 微服务）

```bash
cd MediaMinds_java
# 需先启动 MySQL、Redis、MinIO，并启动 discovery-service
mvn clean install
# 按依赖顺序启动各微服务（先 discovery，再 gateway 与业务服务）
```

### 2. 前端（Next.js）

```bash
cd MediaMinds_next
npm install
npm run build && npm start   # 生产模式，默认 http://localhost:5173
```

### 3. Python AI 服务

```bash
# 安装依赖后运行 Notebook（歌词识别 / 章节划分）
# 依赖：openai-whisper、onnxruntime 等
```

> 运行前请根据本地环境修改各服务 `src/main/resources/application.yml` 中的数据源、Redis、MinIO 与各类 API Key 配置。

---

## 八、作者与许可

- 作者：JasonCao（[JasonCao2003](https://github.com/JasonCao2003)）
- 仓库：<https://github.com/JasonCao2003/MediaMinds>
- 许可：Apache-2.0
