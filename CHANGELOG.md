# 更新日志 (Changelog)

本项目的所有重要更新都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 (Semantic Versioning)](https://semver.org/lang/zh-CN/)。

更新类型分为：`Added`（新增）、`Changed`（变更）、`Fixed`（修复）、
`Removed`（移除）、`Deprecated`（弃用）、`Security`（安全）。

---

## [Unreleased]

### Added
- **个人时长统计与 AI 年度报告**：
  - **数据层**：新增 `user_db.user_activity` 表（按「用户 × 日期 × 媒体类型」聚合，唯一键 `uk_user_date_type`，每次上报累加）。
  - **接口（auth-service）**：`POST /v1/auth/activity/report` 累加时长；`GET /v1/auth/activity/summary?days=` 返回今日/本周/本月/本年/累计 + 每日明细 + 连续使用天数 + 可选年份；`GET /v1/auth/activity/annual?year=` 返回年度聚合（月度分布、最活跃的月与日、年度最长连续）。
  - **统计口径**：只统计「真的在消费内容」的时间——阅读器页面可见、视频播放中、音乐播放中；暂停、切走标签页、关闭页面都不计。前端 `useActivityTracker` 每 30 秒上报一次增量，页面隐藏/卸载时补报，上报失败会把秒数放回去下次再报。
  - **AI 年度报告（agent-service）**：新增 `POST /v1/agent/report`。前端把「年度时长 + 使用习惯 + 收藏/观看历史里的内容清单」组装后交给大模型，由 DeepSeek 撰写含「总评 / 阅读 / 观影 / 音乐 / 习惯 / 寄语」六个板块的回顾；**未配置大模型或调用失败时回退规则式报告**，与智能入库 Agent 的降级链路一致。输出格式用 `【标题】` 朴素标记而非 JSON，解析失败时整体作为一段展示，不丢内容。
  - **前端**：新增「时长统计」页（`/content/stats`）：范围切换（今日/本周/本月/本年/累计）、三类占比条、近 30 天堆叠柱状图（**纯 CSS 绘制，未引入图表库**）、使用习惯卡片，以及按需触发的年度报告生成与板块展示。
- **Next.js 前端（`MediaMinds_next/`）**：基于 Next.js 15 App Router + TypeScript + Material UI v6（Material Design 3）全新前端，覆盖登录/注册、用户端与管理员端全部页面。
  - Material Design 3 主题体系（明暗双主题、品牌色令牌、统一动效与无障碍规范）。
  - Zustand 状态管理、Axios 请求层（拦截器/token/通知）、STOMP over SockJS 实时通知。
  - 管理端通用 CRUD 脚手架、ECharts 控制面板、文件上传与版本管理。
  - 与后端网关一致的 `/api`、`/oss`、`/ws` 开发代理。
- **本地部署编排（`deploy/`）**：`docker-compose.yml`（MySQL/Redis/MinIO/Zookeeper/Kafka）、`mysql-init/*.sql`、一键启停脚本 `start-all.sh` / `stop-all.sh` 与部署说明。
- **外部数据源接入**：复用后端已有集成，从 **酷狗音乐**（`/v1/music/kugou/import`）与 **Project Gutenberg**（`/v1/book/gutenberg/import`，经 Gutendex）批量拉取真实数据入库，`song`/`book`/`movie` 记录标注 `source` 来源。
- **智能入库 Agent（`agent-service`，端口 9011）**：新增自然语言入库服务。用户描述「我想要某个视频/图书/音乐」后，Agent 解析意图（类型 / 检索维度 / 关键词）→ 通过 OpenFeign 聚合调用酷狗、TMDB、豆瓣三个数据源 → 归一化为统一候选结构返回 → 用户勾选后批量入库元数据（媒体本体不入库，可自行上传）。支持按标题 / 歌手 / 作者 / 演员 / 导演检索。
- **Agent 升级为 LangChain4j 工具调用智能体**：接入 [LangChain4j](https://github.com/langchain4j/langchain4j) `1.22.0` + **DeepSeek**（OpenAI 兼容协议），由大模型自主决定调用哪个数据源、如何回答，替代原先的固定编排。
  - 5 个 `@Tool`：`searchMusic` / `searchMovies` / `searchMoviesByPerson` / `searchBooks` / `importCandidates`（按候选序号批量入库）。
  - **多轮对话**：`MessageWindowChatMemory` 按 `sessionId` 维护上下文，支持「前三个都入库」这类追问；候选按会话快照保存，跨轮次仍可按序号引用（`@ToolMemoryId`）。
  - 新增接口 `POST /v1/agent/chat`（多轮对话）、`POST /v1/agent/session/clear`（清空会话）、`GET /v1/agent/status`（引擎/模型状态）。
  - **优雅降级**：未配置 API Key 或大模型调用失败时，自动回退为规则式解析（`IntentParser` 保留为兜底链路），服务始终可用。
  - 模型经 `agent.llm.*` 配置，默认 `https://api.deepseek.com/v1` + `deepseek-chat`；Key 由环境变量 `DEEPSEEK_API_KEY` 注入（写入已 gitignore 的 `deploy/.env.local`）。
- 前端新增「智能入库」页面（`/content/agent`）：对话式交互 + 候选卡片多选 + 批量入库；展示智能体回复、引擎徽章（LangChain4j / 规则）、工具调用徽章与 token 用量，支持「新会话」。
- 影视数据源扩展：`/v1/video/tmdb/person/search` 与 `/v1/video/tmdb/person/movies`，支持按演员 / 导演检索影片。
- **豆瓣书源（`book-service`）**：新增 `/v1/book/douban/search`、`/v1/book/douban/{id}`、`/v1/book/douban/import`，抓取豆瓣图书搜索结果与 rexxar 详情接口，仅入库元信息（书名/作者/封面/简介/出版信息），不下载正文。Agent 的图书来源已切换为豆瓣。

### Changed
- **图书 / 视频 / 音乐三页统一新增「最近」视图**：
  - 筛选区统一为 **[最近] [全部] [收藏]** 三个按钮；选中「最近」时再展开子切换 **[最近添加 | 最近观看]**。图书页默认停在「最近」。
  - **最近添加** 复用各服务的 `/list`（后端本就按 `create_time` 倒序），只取一页 24 条、不显示分页；音乐服务的歌曲列表原本**没有任何排序**，已补上 `create_time` 倒序。
  - **最近观看** 用 **localStorage** 记录（`lib/recent.ts`）：图书与音乐后端都没有阅读 / 播放记录表，这里存一份**卡片快照**，渲染最近列表时不需要按 id 逐个回查接口（避免 N+1 请求）。阅读器打开书籍、播放器与音频引擎开始播放时写入；同一条会自动去重并置顶。代价是换浏览器或清缓存会丢。
  - **封面兜底** 新增 `components/common/CoverImage.tsx`：空串、纯空格、以及**加载失败的失效链接**都回退到默认封面（原先只写 `src={cover || '/cover.jpg'}`，兜不住死链）。三个页面与阅读器、播放页统一改用它。
- **视频页去掉搜索维度筛选**：移除搜索框前的「片名 / 导演 / 主演」切换，改为单一模糊搜索；后端 `searchMovieList` 同步扩展为同时匹配 `name` / `directed_by` / `actor` / `abs` / `info`。
- **图书页模糊搜索补上作者**：占位符写的是「输入图书名或作者名」，但后端只匹配了书名与简介，现已把 `book_author` 纳入模糊匹配。
- **音乐页移除「歌手」浏览功能**：删除歌手 Tab 与歌手卡片网格（含「点歌手播放全部」）；但**保留** `singerNameById` 名字解析链路——歌曲表只有 `singer_id`，`SongRow` 需要展示歌手名，删掉会导致列表全部显示「未知歌手」。
- **前端整体改版为 Brutalism（粗野主义）设计系统**，替换原「Midnight」深色主题：
  - **反设计取向**：圆角一律 0px、**取消全部阴影**（层次改由 3px 实心描边表达）、**禁止过渡动画**（状态瞬时切换）、背景铺 28px 可见网格线。色彩改用纯原色（蓝 `#0000FF` / 红 `#FF0000` / 黄 `#FFFF00`）+ 黑白。
  - **双主题 + 右上角切换**：浅色（白底黑框）与深色（黑底白框），由 `<html data-theme>` 驱动一套 CSS 变量。主题持久化改用 **cookie**，根布局在 SSR 阶段读取并直接写入 `data-theme`，因此首帧即正确主题——既不需要阻塞脚本，也没有水合不一致。
  - 深色模式下纯原色不可读（`#0000FF` 在黑底上对比度仅 2.4:1），因此**文字用强调色单独给了一组提亮变体**，填充色仍用纯原色。
  - 历史遗留的 `--mm-raised-*` / `--mm-sunken-*` 令牌**语义已从「阴影」改为「描边环」**（用 `box-shadow` 画环，不占盒模型、无布局位移），因此页面无需重写即可整体换风格。
  - **字体更换为 Space Grotesk**（Brutalism 官方搭配 · Kinetic Brutalism），中文回落系统黑体，移除 ZSFT CDN 依赖。
  - 侧边导航由纯图标轨道改为**带文字的实心面板**，**选中项整体反白** + 方块指示器；页面标题/副标题改由 `AppShell` 统一渲染，废弃 `PageHeader` 组件。
  - MUI 主题集中覆盖 30+ 组件（Card / Button / IconButton / TextField / Select / Tabs / ToggleButton / Chip / Avatar / Dialog / Menu / Tooltip / Drawer / Slider / Switch / LinearProgress / Skeleton / Table / Accordion / Alert / ListItemButton …），页面内不再手写阴影与颜色。
  - 新增 `MediaMinds_next/DESIGN.md` 设计规范（令牌表、元素语义、无障碍红线、反模式）。
  - 无障碍：全局 `:focus-visible` 焦点环、正文对比度 ≥ 4.5:1、点击目标 ≥ 44px、状态不单靠颜色传达（选中项另有反白/方块指示/更粗描边）；修复阅读器「夜间」底色黑底黑字的对比度缺陷（`THEMES[key].fg`）。
- **前端取消「管理端」概念，统一为单一角色**：删除 `/admin` 路由组与 `AdminLayout`，13 个内容管理页迁移到 `/content/manage/*`（控制面板 / 用户 / 图书 / 音乐 / 视频），导航合并进唯一的 `UserLayout`（管理分组悬停弹出子菜单）；`api/admin.ts` → `api/manage.ts`、`components/admin/` → `components/manage/`；移除 `isAdmin()`、`UserInfo.role`、个人页「管理员/普通用户」标签、用户管理页的角色筛选/切换按钮；`GlobalMusicPlayer` 不再按角色隐藏。
- **后端彻底移除角色体系**：删除 4 个服务的 `RoleCheck` 注解类与 37 处 `@RoleCheck` 注解；`Interceptor` 不再读取 `X-Role`；网关不再透传 `X-Role`；JWT 不再写入 `role` claim；移除 `/v1/auth/user/updateRole` 接口、`UserService.updateUserRole`、`UserMapper.updateUserRole`、`User.role` 与 `UserDTO.role`；`user` 表移除 `role` 列（建表 SQL 同步更新）；影视评论删除权限由「作者或管理员」收敛为「仅作者本人」。
- 前端技术栈由 Vue 3 + Element Plus 迁移至 Next.js 15 + Material UI，端口统一为 5173。
- 前端视觉重构为「Midnight」深色设计系统：仅深色主题、近黑深蓝背景 + 大圆角悬浮外壳、浅紫强调色 `#7C7FF2`、低饱和卡片与颗粒质感；左侧导航改为纯图标轨道（悬停提示，管理端分组悬停弹出子菜单）。
- 全站字体更换为 **JetBrains Maple Mono**（经 ZSFT CDN 按 unicode-range 分片加载）。

### Removed
- 移除 `MediaMinds_vue/`（Vue 3 前端），功能已由 `MediaMinds_next/` 完整替代。
- 移除前端「文档管理」功能：用户端 `/content/document`、管理端 `/admin/document` 页面、导航入口、`api/document.ts` 及相关类型（后端 `document-service` 随后一并移除，见下）。
- 移除 `spark-service`（讯飞星火大模型服务）及其网关路由与启动项；同步移除前端依赖它的「文章 AI 概要」（阅读器）与「歌词情感分析」（音乐页）功能。
- 移除独立的「酷狗音乐」页面（`/content/kugou`）与导航入口，改为合并进「音乐浏览」页的「酷狗搜索」标签页。
- **改为单用户模式**：移除全部角色校验（music/book/video/document/auth 服务的 `Interceptor` 不再校验 `@RoleCheck`），前端去掉 `admin` 路由守卫与角色跳转；用户数据精简为 1 个账号（`caozhexuanadmin`，role=`user`）。
- **移除 `notification-service` 与 `document-service`**：删除两个 Maven 模块、网关路由（`/v1/notification/**`、`/v1/document/**`）、`deploy/start-all.sh` 与 `stop-all.sh` 中的启动条目，以及 `deploy/mysql-init/05_document_db.sql`、`06_notification_db.sql`。
- **移除 Kafka + Zookeeper 基础设施**：删除 `deploy/docker-compose.yml` 中的 `mm-kafka` / `mm-zookeeper` 服务与 `mm-kafka-data` 卷；同步清理 auth / book / demo / music / video / flask 六个服务的 `spring-cloud-starter-bus-kafka`、`spring-kafka` 依赖，`spring.kafka` 与 `spring.cloud.bus` 配置，`KafkaProducerConfig` 类，以及 auth-service（4 处）与 demo-service（1 处）的 Kafka 消息发送代码。基础设施现仅保留 **MySQL / Redis / MinIO**。
- **移除前端「消息中心」**：`/content/message` 页面、`lib/websocket.ts`、`stores/messageStore.ts`、`components/user/MessageList.tsx`、`UserLayout` 导航入口与顶栏铃铛、首页通知卡片、`AuthBootstrap` 与登录页/个人页的 WebSocket 调用，以及 `next.config.mjs` 的 `/ws` 代理与 `.env.example` 的 `WS_URL`。
- **移除 `config-service`**：删除该 Maven 模块、父 pom 条目与启停脚本条目；同步清理 agent / auth / book / demo / music / video 六个服务的 `spring-cloud-starter-config` 依赖、`spring.cloud.config` 配置块，以及 4 个服务 `DataSourceConfig` 上的 `@RefreshScope` 注解（无配置中心后已无意义）。各服务改为完全依赖本地 `application.yml`。
- **移除人脸识别登录**：删除 `flask-service` 模块（其唯一职责是人脸登录的 Python 桥接）与网关 `/v1/flask/**` 路由；删除 auth-service 的 `/v1/auth/login/faceLogin` 接口、`LoginService.faceLogin` 方法与 `Service/FlaskService`（连同仅其使用的 `jettison` 依赖，并移出网关 JWT 白名单）；删除前端登录页的人脸 Tab、摄像头拍照逻辑、`faceLoginService` 与 `api/login.ts` 中的人脸封装；删除 `MediaMinds_py/FaceIdentity.ipynb` 与 `face_db/`。登录方式保留**账号密码**与**邮箱验证码**。
- **移除 `PAPER.md`**：该论文正文描述的是早期架构（Vue.js 前端、讯飞星火大模型、InsightFace 人脸登录、文档服务、Kafka、RBAC 多角色），与当前实现严重不符，已从仓库删除；同步清理 README 与 PROJECT_DESCRIPTION 中对它的引用。
- **移除内容管理页与图表依赖**：删除整个 `/content/manage`（控制面板 / 用户 / 图书 / 音乐 / 视频共 12 个页面）、`components/manage/`（CrudManager、UploadAction）、`components/common/DataTable.tsx` 与 `EChart.tsx`；从 `package.json` 移除 `echarts` / `echarts-for-react`（约 54 MB 依赖、单页编译 3400+ 模块）；`api/manage.ts` 精简为 `api/stats.ts`（仅保留首页内容统计），`api/user.ts` 移除用户管理接口。左侧导航收敛为 **首页 / 图书浏览 / 视频浏览 / 音乐浏览 / 智能入库 / 个人信息**。

### Fixed
- **修复影视观看进度的写入 bug**：`watchProgress` 的约定是 0-1 的比例，但播放页曾把 `video.currentTime`（秒数）直接传上去，导致库中出现 `watch_progress = 23.00` 这类越界值；现改为传比例，读取时兼容历史数据（>1 视为秒数，≤1 视为比例并在拿到 `duration` 后换算定位）。
- **根治「服务启动即崩」的坏字节码问题**：`mvn install`（不带 `clean`）后，部分 Lombok `@Data` 类会落盘为
  `Code` 属性长度为 0 的坏字节码，JVM 直接拒绝加载并抛
  `java.lang.ClassFormatError: Invalid method Code length 0`。本次共 9 个类受影响
  （`agent-service` 5 个：`Config.AgentLlmProperties`、`DTO.AgentChatRequest/AgentImportRequest/AgentQueryRequest/Candidate`；
  `gateway-service` 1 个：`DTO.Result`；`demo-service` 3 个：`DTO.Result`、`DTO.User`、`Pojo.Demo`），
  表现为 `agent-service`(9011) 与 `gateway-service`(8080) 启动失败，而 `start-all.sh` 只报「等待端口超时」。
  - 父 pom 的 `maven-compiler-plugin` 关闭 `useIncrementalCompilation`，并显式声明 `annotationProcessorPaths`（JDK 17+ / MCP 3.12+ 推荐做法）。
  - `deploy/rebuild.sh` 后端**默认 `mvn clean install`**（新增 `--incremental` 才跳过 clean）。
  - 新增 `deploy/tools/CheckClassFiles.java`：构建后用**真实类加载器**逐个加载 `target/classes` 做完整性自检，并在 `rebuild.sh` 中自动执行。
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
