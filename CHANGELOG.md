# 更新日志 (Changelog)

本项目的所有重要更新都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 (Semantic Versioning)](https://semver.org/lang/zh-CN/)。

更新类型分为：`Added`（新增）、`Changed`（变更）、`Fixed`（修复）、
`Removed`（移除）、`Deprecated`（弃用）、`Security`（安全）。

---

## [Unreleased]

### Added
- **书单 / 播单**：图书与影视新增多列表管理（`book_list` / `video_list`），收藏图标改为弹出「加入书单 / 播单」选择框；列表支持新建、编辑、删除、查看成员与移除。原收藏由迁移脚本归入「我的收藏」列表，在线书源 / TMDB / 酷狗的按钮不再直接收藏，只负责入库。
- **影视第三方播放源**：没有本地视频的影片可从 TMDB `watch/providers` 查询订阅 / 租借 / 购买平台并跳转观看；`movie` 新增 `tmdb_id`（迁移 `2026-10-20-movie-tmdb-provider.sql`），新导入自动写入，老数据按标题回查一次并回填。详情页和播放页都会显示播放源，地区默认 `CN`，可用 `TMDB_WATCH_REGION` 覆盖。
- **歌词情感分析 / 阅读划词工具**：音乐播放页新增 Agent 按钮，调用 `/v1/agent/analyze` 分析歌词情感（未配置大模型时回退规则式）；章节阅读器与 EPUB 阅读器支持选中文字后标记颜色、添加笔记（波浪线标记）与 AI 选段分析，标签与笔记按章节存 localStorage。
- **音乐卡片「移除」按钮**：「最近」与「库」的歌曲卡片都新增移除按钮，但语义不同——「最近」只清除本地播放记录（在线播放留下的 id 是酷狗 hash，不能当 songId 去删库）；「库」才是从曲库删除（带确认），并顺带清掉最近播放快照。
- **酷狗登录态长期保存**：登录成功后把 token / userid / dfid / vip 信息写入 `music_data.kugou_auth`（单行表，迁移 `2026-10-19-kugou-auth.sql`），music-service 启动时自动读回，重启服务无需重新登录；新增 `GET /login/status` 与 `POST /logout`，登录弹窗显示当前登录状态并支持退出登录（token 明文存库，适合本机自用）。
- **播放界面 + 酷狗登录（音乐）**：新增 `/content/music/playing` 播放界面（大封面、进度条、上一首/播放暂停/下一首、播放列表、歌词），点歌曲封面播放时自动进入，点侧边栏播放器的封面也能进入（不加按钮）。音乐库卡片精简为只有「加入播放列表」「加入歌单」两个按钮，点封面即播放。音乐页工具栏新增「酷狗登录」：扫码 / 手机验证码两种方式，后端把返回的 token/userid/dfid 写入进程内配置，后续搜索、播放直链、导入立即生效（重启回到环境变量配置）。
- **收藏即入库（书 / 影视 / 音乐 / 智能收藏）**：在线面板的「导入」改为「收藏」——收藏时先把元数据写入本地库，再加入收藏；从收藏移除不会删除库里的内容（可在库中自行移除）。智能入库 Agent 的「批量入库」改为「批量收藏」，后端导入后自动调用各服务的收藏接口。音乐在线结果同样改为「收藏（会先加入曲库）」。
- **图书阅读进度（本地记录）**：新增 `lib/readingProgress.ts`，章节正文阅读器记 `chapterId`、EPUB 文件阅读器记 spine 下标、CBZ 记页码（兼容旧的 `mm_reader_progress`）。图书详情按钮据此在「开始阅读 / 继续阅读」间切换并显示「上次读到…」；继续阅读会直接跳回上次位置。
- **在线搜索歌曲「加入歌单」**：酷狗结果里每首歌新增一个歌单按钮——先导入本地（后端按「歌名 + 歌手」去重）拿到 `song.id`，再打开歌单选择弹窗（可收藏或加入任意歌单）；导入接口现在返回落库后的 `Song` 实体。
- **歌单化改造（音乐页）**：收藏不再是一个独立 Tab，而是歌单页里的**特殊歌单「我的收藏」**；歌曲行上的心形按钮换成**「加入歌单」**（可选收藏或任意歌单，重复添加由后端返回 409）。新增「歌单」Tab：新建 / 编辑 / 删除歌单（封面在保存后单独上传）、点歌单卡片打开歌曲列表并可**从歌单移除**。移除顶部「管理歌手 / 管理歌单」按钮。后端配套修复：`SongListMapper.updateSongListImg` 的 `#{}` 参数绑定错误（**封面一直上传失败的根因**）、`list_song` 删除语义（原按 `song_id` 会误删所有歌单）、新增「按歌单+歌曲移除」接口、删除歌单时级联清理关联、添加歌曲去重。
- **图书文件入库（用户上传 EPUB / PDF / CBZ）**：只借鉴 BookLore 的「能力清单 + 接口形状」，代码全部自行实现（BookLore 为 AGPL-3.0，MediaMinds 保持 Apache-2.0，未复制任何代码）。
  - **后端**（`book-service`，`com.xupt.book.file`）：文件先落本地**暂存区**并抽取元数据，**此时不落库、不进 MinIO**；用户确认后才转存 MinIO 并回写 `book.file_*` 字段。抽取器零新依赖解析 EPUB（ZIP + OPF）与 CBZ（ZIP + `ComicInfo.xml`），PDF 走 PDFBox（Info 字典 + XMP）；`ExtractSupport` 统一关闭 DTD / 外部实体做 **XXE 防护**（解析的是用户上传文件）。暂存靠 `@Scheduled` 按 TTL 清理，文件超时 / 抽取失败都不阻断用户手工填表。接口：`GET /formats`、`POST /staging`、`GET /staging/{token}/cover`、`DELETE /staging/{token}`、`POST /import`、`POST /import-from-provider`、`DELETE /{bookId}`、`GET /{bookId}/raw`。新增依赖 `org.apache.pdfbox:pdfbox:3.0.3`（Apache-2.0），并补上 `spring.servlet.multipart`（原先默认 1MB，传 EPUB 必 413）。
  - **数据模型**：`book` 表新增文件字段（`file_key` / `file_format` / `file_size` / `file_name` / `file_uploaded_at`）与出版元数据（`subtitle` / `publisher` / `published_date` / `isbn13` / `isbn10` / `page_count` / `language` / `rating` / `review_count` / `series_name` / `series_number`），`book_author` 由 `varchar(20)` 扩到 `varchar(255)`；一键迁移脚本 `deploy/migrations/2026-10-19-book-file-metadata.sql`（**需维护者手工执行**）。
  - **前端两个入口已接通**：① 在线结果点卡片打开**元信息详情弹窗**，可选「仅导入元信息」或「上传图书文件」，文件与在线元信息绑定入库（`import-from-provider`）；② 工具栏「上传图书文件」→ 选文件 → 暂存返回的元数据**预填表单** → 表单里可「检索在线元信息补全」（只合并有值字段，不冲掉已填内容）→ 确认入库。表单新增副标题 / 出版社 / 出版日期 / ISBN / 页数 / 语言 / 丛书等字段，`book_author` 上限同步放开到 255。
  - 图书详情弹窗展示出版信息与已上传文件信息（格式 / 大小），支持**删除文件**（不动元数据）与 PDF「查看 PDF」（带鉴权取 Blob 后交浏览器原生查看器）。
  - **阅读器（阶段 R）**：上传的文件可直接在阅读页打开。**EPUB** 走服务端解包——`/epub/manifest` 按 spine 出目录、`/epub/resource?path=` 读单个 entry，前端把章节正文解析后把 `img/link/source` 的相对引用按 Blob 取回、转 objectURL 内联，去掉 `<script>` / `on*` 事件并用 `sandbox` iframe 渲染，配目录抽屉与上一/下一章；**CBZ** 走 `/cbz/manifest` + `/cbz/page/{index}` 逐页出图；**PDF** 交浏览器原生查看器。资源请求都带 `Authorization`，因此一律 Blob → objectURL，**不能把后端 URL 直接当 iframe/img 的 src**（拦截器管不到）。阅读设置与时长统计沿用既有机制。
  - **统一书源抽象 + OpenLibrary（阶段 3）**：新增 `com.xupt.book.metadata.BookMetadataProvider` 抽象与注册表，把 Google Books / 豆瓣 / Project Gutenberg 收敛到同一组能力（搜索 / 详情 / 导入 / 构建实体），并以适配器复用各自既有 Service、不改动原接口行为；新增 **OpenLibrary** 书源（`/search.json` + `/works/{id}.json`，封面走 `covers.openlibrary.org`）。统一接口 `/v1/book/metadata`（`/providers`、`/search`、`/{provider}/{id}`、`/import`）。`BookFileService.importFromProvider` 改走注册表，因此「在线检索后上传文件」对任意注册书源都可用。前端在线视图新增书源下拉（Google Books / 豆瓣 / OpenLibrary）。
  - **字段加权匹配与合并（阶段 4）**：`BookMetadataMergeService` 用 ISBN / 书名相似度 / 作者相似度给在线候选打分；`/v1/book/metadata/match` 返回带匹配分的候选，`/merge/preview` 按字段给出「填充 / 覆盖」建议（只算不改）。书名 / 作者仅在高度相似时才建议替换，简介取更长的一方，封面只在本地没有时补。前端图书详情新增「在线补全」：选书源 → 候选按匹配分排序 → 勾选字段 → 走既有更新接口落库（「填充」默认勾选、「覆盖」默认不勾）。
  - **BookDrop + 批量刷新 + 元数据锁定（阶段 6）**：`book.metadata_locked` 列（迁移 `2026-10-19-book-metadata-lock.sql`）与 `POST /v1/book/product/{id}/lock`，锁定的书不参与自动刷新；`BookMetadataRefreshService` 按来源映射书源、找匹配分 ≥ 0.6 的候选、**只填充空字段**（`POST /v1/book/metadata/refresh`，支持 `dryRun`）；`BookDropService` 扫描投递目录（默认 `${BOOK_FILE_DIR}/drop`）自动入库（`POST /v1/book/file/drop/scan`），成功移 `processed/`、失败移 `failed/`。两个定时任务分别由 `book.refresh.enabled` / `book.drop.enabled` 控制，**默认关闭**；手动入口在图书页工具栏。
  - **写回文件（阶段 5，仅 EPUB）**：`BookFileWriteBackService` 改写 OPF 中已存在的 `dc:title / creator / publisher / date / language / description`，重新打包（`mimetype` 第一个且 STORED）后覆盖 MinIO 原对象并清缓存；`POST /v1/book/file/{bookId}/writeback`，详情页 EPUB 旁有「写回元数据」按钮（带确认）。PDF / CBZ 无统一可写元数据容器，不做。
  - **自动划分章节（方案 B：指针章节）**：上传 EPUB / PDF 后可自动生成 `book_chapter`，但 `content_path` 只存指针（`epub://{bookId}/{spineIndex}[/{start}-{end}]`、`pdf://{bookId}/{startPage}-{endPage}`），读取时现取正文，不复制存储。EPUB 复用 OPF spine + nav/NCX 标题，单个 XHTML 内按章节正则二次切分（识别并跳过目录页）；PDF 用 PDFBox 按字号 / 加粗 / 章节正则识别标题，识别不到时按 `book.chapters.pdf-fallback-pages` 页窗口兜底，扫描版 PDF 不生成假章节。导入表单与在线详情上传有「同时生成章节」开关（默认开），详情页可「生成 / 重建章节」（`POST /v1/book/file/{bookId}/chapters/rebuild`）；删除文件时指针章节一并清理。带 `chapterId` 阅读时走章节正文，逐章收藏/字数统计可用。
- **图书浏览页改造（参考 BookLore）**：左侧分面筛选栏 + 排序 + 网格 / 列表双视图。
  - **后端**（`book-service`）：新增 `GET /v1/book/product/facets`，返回 类型 / 作者 / 来源 三组可选值与**全库**藏书计数（只 select 参与分面的三列，不把 `book_details` 这种大字段拉回来）；`GET /list` 与 `GET /search` 统一支持 `typeIds` / `authors` / `sources` / `sortField` / `sortOrder`。筛选值用**逗号分隔的字符串**传递——axios 默认把数组序列化成 `k[]=v`，Spring 的 `@RequestParam` 绑定不了。排序字段走**白名单映射到方法引用**（不拼 SQL，天然防注入），未知字段回落「入库时间倒序」，末尾统一补一个 `id` 升序做次序键，避免同一时间戳的记录翻页时抖动。
  - **前端**：新增 `components/user/BookFilterSidebar.tsx`（三组分面 + 复选 + 数量 + 一键清除，作者组限高滚动）；结果区新增排序（入库时间 / 书名 / 作者 / 章节数，升降序切换）与 **网格 / 列表** 视图切换；列表视图 `BookTable` 给一套固定列（封面 / 书名 / 作者 / 类型 / 章节 / 来源 / 操作）。工具栏原先那个「分类」下拉已移除——它的职责并入左侧筛选栏。
  - **范围说明**：BookLore 有 26 个筛选维度（系列 / 出版年 / 语言 / 评分 / 标签 / 页数 / 文件大小…），但 MediaMinds 的 `book` 表只有 `type_id` / `book_author` / `source` 三个可分组字段，所以分面就这三组。字段为空的记录（未归类 / 无作者 / 无来源）不计入分面，但仍在「全部」里可见。
  - 筛选与排序**作用于「全部」视图**（「最近」两个分区、「在线」面板保持原样）；网格列数在带侧栏时降一档，避免卡片被压得过窄。
- **内联内容管理（就地编辑，不另开管理页）**：浏览页/详情页直接管理内容本体与辅助维度。管理**不加任何权限校验**——个人媒体库，登录即可用。
  - **共享件**（`components/manage/`）：`FormFields`（声明式字段渲染，含文件选择与图片预览）、`FormDialog`（表单弹窗）、`DimensionDialog`（辅助维度管理：左列表 + 右表单，**只支持新建 / 编辑，不提供删除**）、`useCrud`（收敛「调用接口 → 判断 code → toast → 刷新」并复用全局确认框）。文件选择用**单个隐藏 input** 统一处理——不在 `<button>` 里嵌 `<input>`（无效 HTML，会触发水合报错）。
  - **删除策略：维度只增不删，只有内容本体可删**。类型 / 分类 / 标签 / 歌手 / 歌单都被内容记录引用，删掉会让引用方变成「未分类 / 未知歌手」这类悬空状态；因此这些维度的 CRUD 只保留新建与编辑（前端也不再引入对应的删除接口），删除能力只留给图书 / 影片 / 歌曲。
  - **图书页**：工具栏新增 **[新建图书] [管理类型]**；详情弹窗新增 **[编辑] [删除]** 与**章节管理**（增/改/删）。封面走「先保存拿 id 再上传」。注意 `book_chapter.content_path` 为 NOT NULL 且后端无正文上传端点，故章节表单只能手填正文路径。
  - **视频页**：工具栏新增 **[新建影片] [管理分类] [管理标签]**；**编辑 / 删除放在影片详情页**（列表卡片保持「点卡片进详情」的既有交互），编辑弹窗同时支持**海报与视频文件**上传。表单必填项依据 `movie` 表的 NOT NULL 约束（`name` / `directed_by` / `actor` / `language`）。
  - **音乐页**：工具栏新增 **[新建歌曲] [管理歌手] [管理歌单]**；歌曲行内新增 **[编辑] [删除]** 按钮。新建歌曲必须带音频文件（`song` 表 `singer_id` / `name` / `url` 均 NOT NULL，`url` 由后端写入）；编辑时音频走独立端点。
  - **表单防重置**：`FormDialog` 只以 `open` 为触发条件重置，并用 ref 读取「打开那一刻」的初始值。若把内联构造的 `initial` 放进 `useEffect` 依赖，会在每次输入后重置表单、冲掉用户已填内容。
- **Google Books 书源（`book-service`）**：新增 `/v1/book/google/search`、`/v1/book/google/{id}`、`/v1/book/google/import`，走官方公开 API，仅入库元信息。可选配 `GOOGLE_BOOKS_API_KEY`（写入已 gitignore 的 `deploy/.env.local`）提高配额——匿名调用在共享出口 IP 上极易触发 `429`。注意该 API 的 `intitle:` / `inauthor:` 前缀运算符当前返回 0 条，因此前端发**裸关键词**、维度过滤在客户端做。
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

- **在线搜索支持懒加载**：图书（豆瓣）/ 视频（TMDB）/ 音乐（酷狗）三个在线结果面板，
  滚动到列表底部时通过 `IntersectionObserver`（`rootMargin: 240px`）自动加载下一页，
  结果**追加**而非替换；底部显示「加载中…」或「没有更多了」。各面板用后端返回的
  本页条数 / `totalPages` 判断是否还有下一页。
- **图书 / 视频 / 音乐三页新增「在线」视图**：工具栏常驻不变，选中「在线」后**搜索框改为搜在线源、筛选下拉变成搜索维度**，结果在下方渲染（面板本身没有搜索框，避免出现两组搜索）。
  - **音乐 → 酷狗**：维度 **[歌曲] [歌手] [专辑]**。后端 `music-service` 新增歌手 / 专辑搜索——酷狗的歌手与专辑在 `msearch.kugou.com`（`complexsearch` 只有 song），返回结构也不同（歌手 `data` 直接是数组、专辑在 `data.info`），已按真实响应做归一化；`/v1/music/kugou/search` 增加 `type=song|singer|album` 参数分发。歌手 / 专辑结果点击后会用其名字再搜一次歌曲。
  - **图书 → 豆瓣**：维度 **[书名] [作者]**。豆瓣搜索只有单一关键词接口，因此在客户端按字段过滤，过滤后为空时给出明确提示。
  - **视频 → TMDB**：维度 **[片名] [演员] [导演]**。片名直接走 `/search`；演员 / 导演走 `/person/search` 取首个匹配再拉 `/person/movies?role=`，是真正的三种搜索。
  - 三个面板统一支持「导入到本地库」，复用各服务已有的 import 接口。
- **新增影视详情页 `/content/movie/[id]`**：展示海报、评分、年份、时长、导演、主演、地区、语言与简介，提供醒目的「播放」按钮与收藏切换。

### Changed
- **图书页简化**：书库去掉「网格 / 列表」切换，固定为海报网格（一行最多六个）。
- **图书详情 / 编辑调整**：详情去掉「锁定元数据」按钮；「在线补全」更名为 **「搜刮」** 并移入「编辑」弹窗顶部——在编辑弹窗里点「搜刮」，选择在线候选、勾选字段后应用，结果会回填到编辑表单，保存时一起提交。搜刮弹窗改为在编辑弹窗之后渲染，保证层级在上方。
- **库的排序控件统一到标题行右上角**：图书「我的书库」、视频「我的影视库」、音乐「我的音乐库」标题行右端都放排序下拉。
  - 图书：只保留 **最近添加 / 最早添加**（去掉升/降序按钮与书名 / 作者 / 章节数选项）；同时**移除左侧分面筛选栏**，书库改单列铺满、一行最多六个。
  - 视频：排序（最近添加 / 最早添加 / 评分从高到低 / 上映时间从新到旧 / 片名 A→Z），默认最近添加。
  - 音乐：排序（最近添加 / 最早添加 / 歌名 A→Z / 歌名 Z→A），默认最近添加；按歌单筛选时禁用（歌单内保持原顺序）。
  - 后端 `MovieService` / `CategoryService` / `SongService` 的列表与搜索接口新增 `sortField` / `sortOrder`（白名单，不拼 SQL），默认 `create_time desc`。
- **图书在线页简化**：去掉「在线书源」与「书名 / 作者」两个下拉，只保留 **Google Books** 一个数据源；搜索关键词同时对书名与作者做模糊匹配，并移除了原先的客户端维度过滤（那会按维度把另一维匹配到的结果丢掉）。
- **图书 / 视频「最近」网格与「库」一致**：最近观看改为和库一样的一行六个网格（不再用两列 `RecentColumn`）；无记录时显示空状态。
- **「最近」只保留最近观看，「全部」改「库」**：图书 / 影视 / 音乐三个页面的「最近」不再展示「最近添加」，只保留最近观看 / 播放；「全部」标签统一改为「库」，默认按入库时间倒序（最新在最上）。
- **图书 / 视频页工具栏精简**：图书页只保留「上传图书文件」（去掉新建图书 / 管理类型 / 批量刷新 / 投递目录入口，相关能力仍保留在详情页与后端接口）；视频页去掉「新建影片 / 管理分类 / 管理标签」三个按钮（影片编辑 / 删除本就在详情页）。
- **`FormDialog` 扩展 `header` / `patch` 两个可选 prop**：`header` 用于在上传表单顶部渲染文件信息与解析提示；`patch` 用于把「检索在线元信息」选中的结果**合并**进当前表单——它与 `initial` 的语义区分开：`initial` 只在 `open` 变 true 时重置整张表单，`patch` 只合并、不重置，避免冲掉用户已填内容。
- **关闭注册**：定位为个人媒体库（单用户、本地使用），登录只做访问控制。网关 `JWTFilter` 白名单移除 `/v1/auth/user/register`；`auth-service` 删除 `/register` 端点；前端登录页移除注册 Tab、表单与 `userRegisterService` / `RegisterData`。`/login` 包体由 9.69 kB 降到 8.03 kB。
- **内容新增接口改为返回实体**：`book` / `movie` / `song` / `singer` / `song_list` 的新增接口由 `Result.success()` 改为 `Result.success(实体)`。原因是所有封面上传端点都**需要已有 id**，前端必须「先保存拿到自增 id 再上传文件」；MyBatis-Plus 插入后会回填 id，直接返回实体最省事。
- **`api/video.ts` 分类 / 标签写接口补上泛型参数**：原先 `request.post(...)` 未给类型参数，返回 `Promise<unknown>`，无法接入 `useCrud`。
- **影视列表卡片不再直接进播放页**：去掉卡片上的「立即播放」浮层按钮，点击卡片改为进入**详情页**，再由详情页的「播放」按钮进入播放页。卡片上只保留收藏切换。
- **「最近」视图改为同页双分区**：去掉「最近添加 / 最近观看」子切换，两个结果**并列展示在一个页面**，
  各自是一个分区（小标题 + **两列**卡片网格），互不遮挡。三页（图书 / 视频 / 音乐）一致。
  - 音乐页右侧分区叫 **「最近播放」**（音乐是「播放」不是「观看」），且该页两个分区各只取 **12 条**。
  - 图书与视频页的卡片**缩小**：普通网格改为 **一行六个 × 两行**（12 条）；「最近」两个分区左右并列、**各一行三个**，
    卡片宽度与普通网格一致（约 1/6）。封面改用 `aspectRatio: 2 / 3`，随卡片宽度自动缩放，不再写死像素高度。
  - **视频的「在线」结果面板**同步改为 **一行六个**（`TmdbPanel`），间距与封面宽高比也和普通网格对齐，
    骨架屏数量由 8 提到 12（一行六个 × 两行），避免加载完成后行数跳变。
  - **图书 / 影视卡片改为「整张封面 + 图上叠加文字」**：去掉卡片下方的文字区（书名、作者、两行简介、分类/类型标签），
    整张卡片就是封面（`aspectRatio: 2 / 3`），书名 + 作者（影视为片名 + 导演）叠在图上，底部加一层深色渐变遮罩保证可读。
    「在线阅读 / 收藏」按钮保留（属操作而非信息）。新增设计令牌 `--mm-scrim` / `--mm-scrim-text`——
    遮罩固定深色、**不随主题变化**，因为它是压在图片上的。骨架屏同步简化为纯海报块。
  - 同时把卡片抽成局部组件（`BookCard` / `MovieCard`），让两个分区与「全部 / 收藏」的普通网格共用同一份卡片代码，避免重复。
  - 「最近」视图下不再显示全局大标题（两个分区各有自己的小标题）。
- **三个内容页工具栏统一为一行**：从左到右固定为
  **[搜索框（搜索按钮内嵌在框内右侧）] [筛选▾] [最近] [收藏] [全部]**。三页控件尺寸与顺序完全一致。
  - **筛选** 按页面语义各取所需：图书 = 分类；视频 = 类型（原先那排分类 chip 收进下拉）；音乐 = 歌单（选中后只看该歌单里的歌）。
  - **视频页**去掉「排序」下拉与「重置」按钮，统一使用后端 `create_time` 倒序——客户端再按评分排序会破坏「最近」的顺序。
  - **音乐页**由 `Tabs` 改为与其他两页一致的按钮组；「歌单」从浏览视图变为筛选下拉；
    酷狗搜索恢复为视图按钮组里的 **[在线]**（选中后渲染 `KugouPanel`，此时隐藏搜索框与歌单下拉，用面板自带的搜索）。
- **侧边栏去掉「个人信息」导航项**：该入口已在右上角头像菜单里（`AppShell` 的 `onProfile`），避免重复；`/content/profile` 路由与页面标题保持不变。
- **图书 / 视频 / 音乐三页统一新增「最近」视图**：
  - 筛选区统一为 **[最近] [全部] [收藏]** 三个按钮。图书页默认停在「最近」。（后来的版本去掉了「最近添加 / 最近观看」子切换，改为同页双分区。）
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

### Added
- **新增 Google Books 书源**（`book-service`，前缀 `/v1/book/google`）：搜索 / 详情 / 导入本地书库。
  走官方公开 JSON 接口（`googleapis.com/books/v1`），有明确的状态码语义（配额用尽返回 429），
  不会像爬第三方页面那样因改版整体失效。`book.google.api-key` 可选——不配走匿名配额（每日有限），
  配了配额更高（环境变量 `GOOGLE_BOOKS_API_KEY`）。前端 `OnlineBooksPanel` 支持 `source="google" | "douban"` 切换书源。
- **图书页的「在线」默认改用 Google Books**：豆瓣的 rexxar 接口是爬来的私有接口、没有配额保障，
  实测连续请求会被直接封 IP（全部 403）。面板已泛化为 `OnlineBooksPanel`（可按 `source` 切换），
  图书页传 `source="google"`。豆瓣那套**保留**——`agent-service` 的图书检索仍走 `/v1/book/douban/search`。

### Fixed
- **歌单封面上传失败**：`music-service` 没有配置 `spring.servlet.multipart`，Spring 默认单文件只有 **1MB**，稍大的封面直接 413。已补 `max-file-size: 200MB` / `max-request-size: 210MB`（顺带修复大音频上传）。
- **删除内容后的残留数据**：音乐「最近播放」也是本地快照，删歌时先校验是否还在库，404 就清掉快照、不再反复报错；后端删除图书时级联清理收藏与章节，删除影片时级联清理收藏与观看记录（`book_favorite` / `book_chapter` / `favorite` / `user_video_interaction`），避免收藏 / 最近列表出现孤儿记录或分页总数虚高。
- **已删除的书仍出现在「最近观看」、点删除报「书籍不存在」**：`mm-recent` 是 localStorage 快照，删书不会自动清。新增 `removeRecent`；打开详情前先按 id 校验，404 就清掉本地残留并刷新；删除时后端返回 404 也按「已不存在」处理——清掉本地记录并关闭弹窗，不再反复报错。
- **酷狗逐字歌词（KRC 格式）直接显示成时间标签**：新增 `lib/lyric.ts` 解析两种格式——酷狗 `[start,duration]<offset,duration,?>字…`（毫秒）与标准 LRC `[mm:ss.xx]`，忽略 `[ti:]`/`[ar:]`/`[hash:]` 等元信息行。播放界面据此渲染歌词：**当前行随播放高亮并自动滚动到中间**（瞬时滚动，不加动画），点某一行可跳转到该时间；无时间标签则按纯文本兜底。
- **在线酷狗播放时播放界面没有封面 / 歌词**：在线播放构建 Track 时补上 `pic`（封面）并在起播后异步拉取歌词；播放界面若发现当前曲目缺歌词且带酷狗 hash，会现取一次并回填（`playerStore.updateCurrent`）。这样在线直点播放、以及加入歌单后从列表播放都能显示封面与歌词。
- **「加入歌单」弹窗混入「我的收藏」**：弹窗现在只列出自建歌单，「我的收藏」不再出现在列表里——收藏统一走音乐卡片 / 在线结果上的「收藏」按钮，避免在弹窗里误操作或触发异常。
- **登陆酷狗后仍然播放不了音乐**：导入时拿不到直链的歌曲 `song.url` 为空，且直链本身带时效，过期后也播不了；原表没有存 hash，无法重新取地址。现在：`song` 表新增 `kugou_hash` / `kugou_album_id` / `kugou_album_audio_id` / `source`（迁移 `2026-10-19-song-kugou-source.sql`），导入时写入；播放前前端按 songId 调新增的 `POST /v1/music/kugou/url/by-song` 用 hash 重新解析直链并回写，拿不到地址时给出「需要登录 / 会员」的提示。旧的歌曲重新导入一次即可补齐 hash。
- **图书详情弹窗右侧内容被裁切**：长文件名 + 右侧一排操作按钮把网格列撑宽，导致「编辑 / 删除 / 在线补全」等被挤出可视区。改为第二列 `minmax(0, 1fr)`、文件信息行与操作行 `flexWrap` 换行、文件名溢出省略，并给 `DialogContent` 关掉横向滚动。
- **「继续阅读」不生效、总是从头开始**：上传的 EPUB/CBZ 同时存在「文件阅读器」与「章节正文阅读器」两条路径——`startReading` 统一跳文件阅读器，忽略了章节模式保存的 `chapterId`；更关键的是阅读页初始化时会自动加载第一章并把进度覆盖成 `chapterId`，把文件模式存的 `chapterIndex` 冲掉。现在：进度增加 `mode`（chapter/file），「继续阅读」按上次模式跳转（章节模式带 `chapterId`）；文件类图书在无 `chapterId` 时**不再自动加载章节**，避免覆盖文件进度。
- **导入本地后歌曲显示「未知歌手」**：`song` 表只有 `singer_id`，前端原先靠预取的歌手列表（`pageSize=500`）反查，歌手多了或刚导入时查不到。新增 `SingerNameResolver`，在歌曲列表 / 搜索 / 歌单歌曲 / 收藏歌曲接口返回前批量补齐 `singerName`（`Song` 增加非表字段 `singerName`），前端优先使用；导入酷狗歌曲后也会刷新歌手列表。酷狗导入改为按「歌名 + 歌手」去重，重复导入复用已有记录。
- **修复图书页「分类」下拉从未生效**：`loadBooks` 一直没把 `typeId` 传给后端（`/list` 当时也不接受筛选参数），下拉纯粹是装饰——选中后标题会变成「XX 分类图书」，但列表纹丝不动。现已由左侧筛选栏真正接管，后端 `applyFacets` 生效。
- **修复图书模糊搜索的 OR 优先级缺陷**：`searchBookList` 原先把三个 `like` 直接串 `or()`，一旦叠加任何 `AND` 条件，SQL 就会变成 `a LIKE x OR b LIKE y OR (c LIKE z AND …)`（AND 优先级高于 OR），筛选只会作用在最后一个 `like` 上。改用 `and(w -> …)` 把关键词的三个 `like` 包成一组。
- **修复豆瓣在线搜索永远返回 0 条**：`DoubanClient` 原本抓 `book.douban.com/subject_search` 页面里的 `window.__DATA__`，
  该页面结构已变更、解析不到任何结果（实测任何关键词都是 `count: 0`）。改为走 **m 站 rexxar 接口**
  （`m.douban.com/rexxar/api/v2/search?q=&type=book&count=&start=`，与详情接口同源），并顺带支持 `start` 翻页。
  rexxar 的 `card_subtitle` 顺序是「作者 / 年份 / 出版社」，而 `DoubanService.normalize` 按「作者 / 出版社 / 年份」解析，
  客户端做了重排，作者 / 出版社 / 年份才不会错位。
- **修复影视「最近观看」封面不显示**：原先走 localStorage 卡片快照，而快照里的封面是在
  `picture` 兜底修复**之前**写入的，老记录一律没有封面。改为直接使用**服务端的观看历史**
  （`user_video_interaction`；`/v1/video/history/list` 已按 `last_watch_time` 倒序、返回完整 Movie 含 `picture`），
  封面与字段都齐了，也不再受浏览器缓存影响。
- **修复音乐「全部」只能看到 12 首且没有分页器**：`fetchSongs` 恒传 `pageNum: 1`、也没有 `total`，
  所以永远只显示第一页。现已加上 `page` / `total` 状态、把页码透传给三个取数分支（全量 / 关键词 / 歌单筛选），
  并在列表下方补上与图书页一致的分页器；搜索、切歌单、切视图时都会回到第 1 页。
- **修复影视详情页封面丢失**：后端 `Movie` 实体的封面字段是 **`picture`**（DB 列同名），接口返回的 JSON 里并没有 `pic`。
  列表页做了 `pic || picture || cover` 的兜底所以正常，但**详情页只查了 `pic || cover`** → 取不到 → 回退成默认封面。
  已补全兜底，同时修掉播放页记录「最近观看」时同样的遗漏（否则最近列表里也会是默认封面）；
  `Movie` 类型补上 `picture` 字段。
- **修复影视地区 / 语言显示成数字**：后端 `area`（0 大陆 / 1 香港 / 2 其他 / 3 美国）与
  `language`（0 中文 / 1 英语 / 2 粤语 / 3 其他）存的是 **int 编码**，前端直接 `String(...)` 渲染成了「3」「1」。
  新增 `lib/format.ts` 的 `areaLabel()` / `languageLabel()`，详情页与播放页统一改用文案。
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
