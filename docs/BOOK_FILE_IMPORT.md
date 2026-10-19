# 图书文件入库（Book File Import）

> 创建：2026-10-19
> 状态：**入口① / 入口②、阶段 3 / 4 / 5 / 6 / R、自动划分章节（方案 B）均已完成**
> （后端编译通过，前端 `tsc --noEmit` 与 `next build` 通过）。
> 阶段 6 的定时任务（批量刷新 / BookDrop）默认关闭，手动入口始终可用。
> 参考项目：BookLore（https://github.com/booklore-app/booklore）——**只借鉴能力与接口形状，未复制任何代码**
>
> 这是一份**进行中的交接文档**：功能落地后可删除，或把「未完成的工作」章节清掉、
> 保留接口契约与坑位说明作为长期参考。

---

## 一、任务目标

让 MediaMinds 支持**用户上传图书文件**（EPUB / PDF / CBZ），并在入库时抽取元数据。
数据来源参考 BookLore 的能力，但按 MediaMinds 的技术栈与约束**独立实现**。

### 两种入库入口（用户明确指定）

| 入口 | 流程 |
| --- | --- |
| **① 在线检索后上传** | 用户在线搜到书 → **元信息详情页** → 点「上传图书」→ 上传文件 → 与该元信息绑定入库 |
| **② 直接上传** | 用户先上传图书文件 → **本地抽取元信息** → 预填表单（期间可再**检索在线元信息**补全）→ 确认入库 |

两条路径最终都汇聚到同一个后端接口：`POST /v1/book/file/import` 或 `/import-from-provider`。

---

## 二、已确认的决策（不要再改）

| 项 | 决定 |
| --- | --- |
| **许可证** | MediaMinds 保持 **Apache-2.0**。BookLore 是 **AGPL-3.0**，**绝不能复制其代码**（会传染，且 §13 要求网络服务公开源码）。只借鉴「能力清单 + 接口形状」，代码全部自己写 |
| **存储** | **MinIO**（`mediaminds` bucket），沿用现有 `MinioUtil` 范式 |
| **一本书的文件数** | **单文件** → 列直接加在 `book` 表（不加 `book_file` 表） |
| **上传流程** | **暂存 → 抽取 → 预填 → 确认入库**（不采用「先入库再回填」） |
| **`book_author`** | 从 `varchar(20)` 扩到 **`varchar(255)`** |
| **格式** | **EPUB / PDF / CBZ**（**MOBI / AZW3 明确不做**，用户决定） |
| **阅读器** | **方案 A：服务端解包 + 按资源服务**（不是把原文件交给浏览器端库） |
| **下载** | 只上传，不做前端下载功能 |
| **渲染范围** | 按 **EPUB / CBZ** 渲染（PDF 交给浏览器原生查看器；MOBI/AZW3 无浏览器渲染方案） |

---

## 三、已完成的工作

### 3.1 后端（`book-service`）— 全部完成，编译通过

```
MediaMinds_java/book-service/src/main/java/com/xupt/book/file/
├── BookFormat.java                  格式枚举（EPUB/PDF/CBZ）+ 按扩展名/MIME 识别
├── ExtractedMetadata.java           抽取结果 DTO（字段名与 Book 实体对齐）
├── CoverImage.java                  封面 record（data/contentType/extension）
├── BookFileExtractor.java           抽取器接口
├── BookFileExtractorFactory.java    按格式分发（Spring 注入所有实现）
├── ExtractSupport.java              ZIP/XML/日期/ISBN 共用工具（**含 XXE 防护**）
├── BookFileProperties.java          book.file.* 配置绑定
├── StagedFile.java                  已暂存文件的 record
├── StagingResult.java               暂存结果 DTO
├── StagingService.java              暂存 + 抽取 + TTL 清理
├── BookFileService.java             转存 MinIO / 本地缓存 / 封面 / 删除
├── BookImportRequest.java           入口② 请求体
├── ProviderImportRequest.java       入口① 请求体
├── BookFileController.java          8 个接口
└── extractor/
    ├── EpubExtractor.java           ZIP + OPF 解析（**零新依赖**）
    ├── CbxExtractor.java            ZIP + ComicInfo.xml（**零新依赖**）
    └── PdfExtractor.java            PDFBox（Info 字典 + XMP）
```

**其他后端改动：**

| 文件 | 改动 |
| --- | --- |
| `book-service/pom.xml` | 新增 `org.apache.pdfbox:pdfbox:3.0.3`（Apache-2.0） |
| `application.yml` | 新增 `spring.servlet.multipart`（**原来没配，默认 1MB，传 EPUB 必 413**）+ `book.file.*` |
| `BookApplication.java` | 加 `@EnableScheduling`（暂存清理靠 `@Scheduled`） |
| `Pojo/Book.java` | 新增 16 个字段（文件 5 + 元数据 11） |
| `Service/BookService.java` | 新增 `attachFile` / `clearFile` / `updateCoverUrl`；新增 `LambdaUpdateWrapper` import |
| `Utils/MinioUtil.java` | 新增 `UploadFile(带 contentType)` / `uploadFile(File)` / `downloadToFile` / `statSize` / `openStream` |
| `google/GoogleBooksService.java` | 抽出 `buildBook(volumeId)`（不落库）；作者截断 20→255；补全新元数据字段 |
| `douban/DoubanService.java` | 抽出 `buildBook(doubanId)`（不落库）；作者截断 20→255；补全新元数据字段 |
| `deploy/start-all.sh` | 导出 `BOOK_FILE_DIR`（绝对路径）并 `mkdir -p` |
| `deploy/mysql-init/02_book_db.sql` | `book` 建表同步新增列 + `book_author` 扩到 255 |
| `deploy/migrations/2026-10-19-book-file-metadata.sql` | **新建**，给已有库的 ALTER 脚本 |

### 3.2 前端 — API 层（页面接入见第四章，已完成）

`MediaMinds_next/src/api/book.ts` 已新增：

- 类型：`ExtractedMetadata`、`StagingResult`
- 接口封装：`getSupportedBookFormatsService`、`stageBookFileService`、`getStagingCoverService`、
  `discardStagingService`、`importBookWithFileService`、`importBookFromProviderService`、
  `deleteBookFileService`、`getBookRawFileService`

> 已验证：`lib/request.ts` 的响应拦截器第 113 行对非 `ApiResult` 响应（Blob）会**直接透传**，
> 所以封面 / 原文件这类二进制接口可以正常用。

---

## 四、前端接入（✅ 已完成）

### 4.1 前端 · 图书页 `src/app/(user)/content/book/page.tsx` ✅

1. **扩展 `bookFields()`**：`bookAuthor` 上限 20 → **255** 并去掉字段上限提示；新增
   `subtitle`、`publisher`、`publishedDate`、`isbn13`、`isbn10`、`pageCount`、`language`、
   `seriesName`、`seriesNumber`；表单值统一过 `normalizeBookPayload`（空串删键、数字转
   `Number`、`publishedDate` 归一成 `yyyy-MM-dd`）。
2. **工具栏新增「上传图书文件」按钮**（与「新建图书」并列），`accept` 跟随后端 `GET /formats`。
3. **入口② 的暂存流程**
   - 选文件 → `stageBookFileService(file)` → 拿到 `{ token, metadata }`；期间用阻塞弹窗提示“正在解析…”。
   - 用 `metadata` 预填 `FormDialog` 的 `initial`（字段名与 `ExtractedMetadata` 一一对应），
     `chapterCount` 作为隐藏字段随 `values` 一并入库。
   - `header` 里展示文件名 / 格式 / 大小、`metadata.notes`；封面走
     `getStagingCoverService(token)` → Blob → `URL.createObjectURL`，作为封面字段预览。
   - 用户确认 → `importBookWithFileService(token, bookPayload, useExtractedCover)`；
     用户取消 → `discardStagingService(token)`（关闭弹窗时自动丢弃）。
   - 用户手选了自定义封面：入库成功后再单独 `updateBookCoverService(id, file)`。
4. **入口② 的「检索在线元信息」补全**：新增 `components/user/OnlineMetadataDialog.tsx`
   （Google / 豆瓣切换，打开时用抽取到的书名或作者自动搜一次），选中结果经
   `lib/onlineBook.ts` 归一化后**只合并有值字段**进表单。

> ⚠️ 沉淀成约定：`FormDialog` 新增 **`patch`** prop 就是为了这条链路——`initial` 只在 `open` 变 true 时重置，
> 而“检索在线元信息”要在表单已打开的情况下补充字段，只能合并、不能重置。

### 4.2 前端 · 在线面板 `src/components/user/OnlineBooksPanel.tsx` ✅

1. **点卡片打开元信息详情弹窗**（封面 / 作者 / 出版社 / 年份 / 页数 / 评分 / 简介，
   数据来自 `lib/onlineBook.ts` 的归一化）。
2. 详情弹窗里提供 **「上传图书文件」**：选文件 → `stageBookFileService(file)` →
   `importBookFromProviderService(token, source, detail.id, true)`；失败时丢弃暂存，
   成功时通知外层 `onImported` 刷新本地书库 / 分面。
3. 保留原有「仅导入元信息」按钮（卡片上的「导入」按钮仍在，点击已阻止冒泡）。
4. `lib/onlineBook.ts`：Google `authors[]` / 豆瓣 `author` / 评分对象等差异统一归一到
   `OnlineBookSummary`，在线面板与补全弹窗共用。

### 4.3 尚未开始的大块（用户已同意「全做」，按顺序推进）

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| **1** | 存储 + 扩表 + 暂存/确认流程 | ✅ 后端 + 前端均完成 |
| **3** | `BookMetadataProvider` 抽象 + 收敛现有 3 源 + OpenLibrary | ✅ 已完成 |
| **2** | 5 个抽取器 | ✅ EPUB/PDF/CBZ 完成（MOBI/AZW3 已取消） |
| **R** | **阅读器改造**：ZIP 缓存 + EPUB 资源服务 + CBZ 逐页 | ✅ 已完成（PDF 交浏览器原生查看器） |
| **4** | 字段加权匹配合并 | ✅ 已完成（匹配打分 + 合并预览 + 详情页「在线补全」） |
| **6** | BookDrop + 批量刷新任务 + 元数据锁定 | ✅ 已完成（定时默认关闭，手动入口可用） |
| **5** | 写回文件（MinIO 下载→改→重传） | ✅ 已完成（仅 EPUB） |

---

## 五、接口契约（已完成，前端按此对接）

基址经网关：`/api` → `/v1/book/file/**`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/v1/book/file/formats` | 返回 `["epub","pdf","cbz"]` |
| `POST` | `/v1/book/file/staging` | multipart，字段名 **`file`**。返回 `{ token, fileName, format, size, metadata }` |
| `GET` | `/v1/book/file/staging/{token}/cover` | 返回**图片字节**（非 JSON），无封面 404 |
| `DELETE` | `/v1/book/file/staging/{token}` | 丢弃暂存 |
| `POST` | `/v1/book/file/import` | body `{ token, book, useExtractedCover }` |
| `POST` | `/v1/book/file/import-from-provider` | body `{ token, source:"google"\|"douban", providerId, useExtractedCover }` |
| `DELETE` | `/v1/book/file/{bookId}` | 删除文件（不动元数据） |
| `GET` | `/v1/book/file/{bookId}/raw` | 原始文件字节（PDF 用） |
| `GET` | `/v1/book/file/{bookId}/epub/manifest` | EPUB 目录：`{ format, title, chapters:[{index,title,path,mediaType}] }`，`path` 为 ZIP entry 名 |
| `GET` | `/v1/book/file/{bookId}/epub/resource?path=` | 读 ZIP 内单个 entry（章节正文 / 图片 / CSS / 字体），按扩展名给 MIME |
| `GET` | `/v1/book/file/{bookId}/cbz/manifest` | CBZ 目录：`{ format, title, pageCount }`（自然页序） |
| `GET` | `/v1/book/file/{bookId}/cbz/page/{index}` | 第 index 页（0 基）图片字节 |
| `POST` | `/v1/book/file/{bookId}/chapters/rebuild` | 从 EPUB spine / PDF 标题自动生成（重建）章节，只写指针 |

**统一响应**：`{ code, message, data }`，`code=200` 为成功（与项目其它接口一致）。

**抽取结果 `metadata` 字段**：`bookName` `subtitle` `bookAuthor` `publisher` `publishedDate`
`bookDetails` `isbn13` `isbn10` `pageCount` `language` `seriesName` `seriesNumber`
`chapterCount` `hasCover` `notes[]`。**抽不到的字段是 `null`，不是空串。**

---

## 六、数据模型

`book` 表新增（`deploy/migrations/2026-10-19-book-file-metadata.sql`）：

```sql
-- 文件
file_key varchar(255), file_format varchar(16), file_size bigint,
file_name varchar(255), file_uploaded_at datetime
-- 元数据
subtitle varchar(255), publisher varchar(255), published_date date,
isbn13 varchar(13), isbn10 varchar(10), page_count int, language varchar(16),
rating decimal(3,1), review_count int, series_name varchar(255), series_number decimal(5,1)
-- 修改
book_author varchar(20) → varchar(255)
-- 阶段 6（另见 deploy/migrations/2026-10-19-book-metadata-lock.sql）
metadata_locked tinyint(1) not null default 0
```

> 两个迁移脚本都需要维护者手工执行（见坑 3）：先 `2026-10-19-book-file-metadata.sql`，
> 再 `2026-10-19-book-metadata-lock.sql`。

---

## 七、必须知道的坑

1. **multipart 已修**：`spring.servlet.multipart.max-file-size: 200MB`。之前是默认 1MB。
2. **`BOOK_FILE_DIR`**：服务以 `java -jar` 启动、**CWD 不固定**，所以暂存/缓存目录走环境变量 +
   绝对路径。`start-all.sh` 已导出；直接 `java -jar` 会回落到 `${java.io.tmpdir}/mediaminds-book`。
3. **迁移 SQL 必须由维护者手工执行**（AI 不得执行写操作 SQL）：
   ```bash
   docker exec -i mm-mysql mysql --default-character-set=utf8mb4 -uroot -p123456 book_db \
     < deploy/migrations/2026-10-19-book-file-metadata.sql
   ```
4. **XXE 防护**：`ExtractSupport.parseXml` 已关闭 DTD / 外部实体。解析的是**用户上传的文件**，这个不能删。
5. **`updateById` 忽略 null**：`BookService.clearFile` 用 `LambdaUpdateWrapper` 显式 `set(null)`，
   否则清不掉文件字段。
6. **PDF 渲染封面是重操作**：已限宽 900px 并只抽封面时渲染。渲染失败返回 null，**不影响入库**。
7. **抽取失败不阻断上传**：`StagingService.stage` 捕获异常并返回带 `notes` 的空元数据，
   用户仍可手工填。
8. **阶段 R 的鉴权问题（提前预警）**：EPUB 资源 / CBZ 页图要用 `<iframe src>` / `<img src>`，
   但**这些请求不带 `Authorization` 头**（axios 拦截器管不到），会被网关 401。
   建议方案：前端用 axios 取 Blob → `URL.createObjectURL` → 再喂给 iframe/img。
9. **`source` 字段**：文件入库默认写 `"upload"`；在线源分别是 `"Google Books"` / `"豆瓣"`
   （注意是**可读文案**，不是短代码）。
10. **`.env.local` 不要提交**：`BOOK_FILE_DIR` 走 `start-all.sh` 导出，不进 `.env.local` 也没关系。

---

## 八、验证方式

```bash
# 后端编译
cd MediaMinds_java && mvn -q -pl book-service -DskipTests compile

# 前端类型检查 / 构建
cd MediaMinds_next && npx tsc --noEmit
cd MediaMinds_next && npx next build
```

**运行时验证需要维护者自己执行**（AI 不得启停服务）：
```bash
bash deploy/rebuild.sh backend     # 后端全量构建
# 先跑迁移 SQL（见坑 3），再重启 book-service
```

验证路径建议：上传一个 EPUB → 看返回的 `metadata` 是否正确 → 确认入库 → 检查
`book` 表 `file_*` 字段与 MinIO 对象 → 再试 CBZ 与 PDF。

---

## 九、约束提醒（来自 AGENTS.md）

- **AI 只改代码**，不得启动/重启/停止任何服务，不得执行写操作 SQL
- 允许：编译、类型检查、只读 SQL、读日志、git 操作
- 前端改前必读 `MediaMinds_next/DESIGN.md`（Brutalism：圆角 0、不用模糊阴影、不加过渡动画、
  颜色只走 `--mm-*` 令牌、标题由 `AppShell` 渲染）
- 密钥不进仓库（`deploy/.env.local` 已 gitignore）

---

## 十、本仓库其它未提交的改动（与本任务无关，勿误删）

上一轮已完成的、尚未提交的工作：
- 图书浏览页改造（分面筛选栏 + 排序 + 双视图）——`BookFilterSidebar.tsx`、`book/page.tsx`、
  `api/book.ts` 的 facets 部分、`BookController`/`BookService` 的 `/facets` 与筛选排序参数
- 视频 / 音乐页的内联内容管理
- `movieForm.ts`、`movie/[id]/page.tsx`

这些都已通过编译与类型检查，只是还没 commit。

---

## 十一、阶段 R：阅读器（已完成）

**后端**（`BookFileReaderService`，复用 `BookFileService.ensureCached` 的本地 ZIP 缓存）：

- `epubManifest`：`META-INF/container.xml` → OPF → 按 spine 顺序出章节；章节标题从 XHTML 的
  `<title>` 取（只解前 16KB），取不到回落「第 N 章」。OPF 不可用时兜底按 ZIP 顺序列 html/xhtml。
- `epubResource`：读单个 entry；`path` 做白名单校验（拒绝绝对路径 / `..` / 超长）。
  MIME 走服务内独立的 `mimeOf`——**不能复用 `ExtractSupport.mimeFromName`**（那个只认图片，
  给它加 html/css 会让 `isImage` 把章节正文也算成 CBZ 页）。
- `cbzManifest` / `cbzPage`：复用 `CbxExtractor.listPages` / `pageEntry` 的自然页序。

**前端**（`components/user/BookFileReader.tsx`，`read/[id]` 检测到 `fileFormat` 后整体切换）：

- **EPUB**：取 manifest → 逐章取正文（文本）→ `DOMParser` 解析 → 把 `img/link/source/image`
  的相对引用解析成 ZIP entry 再按 Blob 取回、转 objectURL 内联 → 去掉 `<script>` 与 `on*`
  事件（iframe 再加 `sandbox="allow-same-origin"` 双保险）→ `srcDoc` 渲染。目录抽屉 + 上/下一章。
- **CBZ**：manifest 拿页数 → 逐页取 Blob → `<img>`；上/下一页。
- **PDF**：`getBookRawFileService` 取 Blob → objectURL → 浏览器原生查看器 `<iframe>`。
- 阅读设置（字号 / 行距 / 底色）沿用既有 `mm_reader_settings`；时长统计照旧走 `useActivityTracker`。

> 关键坑：这些资源请求都要带 `Authorization`，**不能把后端 URL 直接塞进 `<iframe src>` /
> `<img src>`**（axios 拦截器管不到），必须走 Blob + objectURL。

---

## 十二、阶段 3：统一书源 + OpenLibrary（已完成）

新增包 `com.xupt.book.metadata`：

- `BookMetadataProvider`：统一抽象——`id` / `displayName` / `supportsImport` / `search` / `detail` /
  `importBook` / `buildBook`。新增书源只需加一个 `@Component`，注册表与统一接口自动带上。
- `ProviderBook`：归一化后的书目结构（字段与 `book` 实体对齐，`toMap()` 供接口输出）。
- `BookMetadataProviderRegistry`：注入全部实现，按 id 建索引。
- 适配器（复用既有 Service，不重写行为）：
  - `provider/GoogleBooksProvider` → `GoogleBooksService`
  - `provider/DoubanProvider` → `DoubanService`
  - `provider/GutenbergProvider` → `GutenbergService`
  - `openlibrary/OpenLibraryProvider` + `OpenLibraryClient`（**新增书源**：`/search.json`、
    `/works/{id}.json`、`/authors/{id}.json`；封面按 `cover_i` 拼 `covers.openlibrary.org`；
    导入写 `book` 表，`source = "OpenLibrary"`）。
- 统一接口 `BookMetadataController`（`/v1/book/metadata`）：
  - `GET /providers` → `[{ id, displayName, supportsImport }]`
  - `GET /search?provider=&query=&page=` → `{ provider, page, pageSize, count, results:[ProviderBook] }`
  - `GET /{provider}/{id}` → `ProviderBook`
  - `POST /import?provider=&id=` → 与各源原 import 一致
- `BookFileService.importFromProvider` 改为走注册表（原先 switch 写死 google/douban），
  因此「在线检索后上传文件」现在支持任意注册书源（含 OpenLibrary）。

前端：在线视图新增**书源下拉**（Google Books / 豆瓣 / OpenLibrary）；`lib/onlineBook.ts` 的
归一化兼容 OpenLibrary 的 `author_name` / `first_publish_year` / `cover_i` 等字段；
Google / 豆瓣 仍走各自旧接口，其余书源走 `/v1/book/metadata/search`。

---

## 十三、阶段 4 / 6 / 5（已完成）

### 阶段 4：字段加权匹配合并

- `BookMetadataMergeService`：
  - `matchScore`：ISBN 完全相同 0.5 + 书名相似 0.3 + 作者相似 0.2（相似度用归一化后的编辑距离）。
  - `preview`：逐字段给建议，`mode` 为 `fill`（本地为空）或 `replace`（本地有值、来源更可信）。
    书名 / 作者只有在相似度 ≥ 0.85 / 0.8 时才建议替换；简介取更长的一方；封面只在本地没有时补。
- 接口：`GET /v1/book/metadata/match?provider=&bookId=&size=`（带 `matchScore` 的候选）、
  `POST /v1/book/metadata/merge/preview?provider=&providerId=&bookId=`（只算不改）。
- 前端：图书详情新增 **「在线补全」**（`BookMetadataMergeDialog`）——选书源 → 候选按匹配分排序 →
  逐字段勾选 → 走既有 `PUT /v1/book/product` 落库。「填充」默认勾选，「覆盖」默认不勾。

### 阶段 6：BookDrop + 批量刷新 + 元数据锁定

- **元数据锁定**：`book.metadata_locked`（迁移 `2026-10-19-book-metadata-lock.sql`）+
  `POST /v1/book/product/{id}/lock?locked=`；锁定的书不参与自动刷新。详情页有开关。
- **批量刷新**（`BookMetadataRefreshService`）：对未锁定的书按来源映射书源，找匹配分 ≥ 0.6 的候选，
  **只应用 `fill` 建议**（绝不覆盖已有值），逐本 `updateById`。
  接口 `POST /v1/book/metadata/refresh?limit=&provider=&dryRun=`；定时任务由
  `book.refresh.enabled` 控制（默认 `false`）。前端工具栏「批量刷新」。
- **BookDrop**（`BookDropService`）：扫描投递目录（默认 `${BOOK_FILE_DIR}/drop`）里的 EPUB/PDF/CBZ，
  复用 `StagingService.stageExternal` 暂存抽取 → `MetadataToBook` 构实体 → `BookFileService.importWithFile`
  入库；成功移到 `processed/`，失败移到 `failed/`。接口 `POST /v1/book/file/drop/scan`；
  定时任务由 `book.drop.enabled` 控制（默认 `false`）。前端工具栏「投递目录」手动触发。

### 阶段 5：写回文件（仅 EPUB）

- `BookFileWriteBackService`：从本地缓存读 EPUB → 改写 OPF 里**已存在**的
  `dc:title / dc:creator / dc:publisher / dc:date / dc:language / dc:description`
  （不凭空插入、不改 `dc:identifier`）→ 重新打包（`mimetype` 第一个且 STORED，其余 entry 原样复制）
  → 覆盖 MinIO 上的原对象 → 清本地缓存 → 回写 `file_size`。
- 接口 `POST /v1/book/file/{bookId}/writeback`；前端详情里 EPUB 文件旁有「写回元数据」按钮（带确认）。
- **注意**：这会覆盖用户的原文件，建议先拿副本验证；PDF / CBZ 没有统一的可写元数据容器，本阶段不做。

---

## 十四、自动划分章节（方案 B：指针章节）

**目标**：上传 EPUB / PDF 后自动生成 `book_chapter` 行，但**不复制正文**——`content_path` 存指针，
读取时再从文件里现取。

### 指针格式

| 格式 | `content_path` | 说明 |
| --- | --- | --- |
| EPUB | `epub://{bookId}/{spineIndex}` | 整个 spine 条目作为一章 |
| EPUB（单文件多章） | `epub://{bookId}/{spineIndex}/{start}-{end}` | 字符区间，偏移基于 `XhtmlTextExtractor` 的归一化文本 |
| PDF | `pdf://{bookId}/{startPage}-{endPage}` | 页区间 |

`BookChapterService.getChapterContent` 识别这两种前缀，分别调 `BookFileReaderService`
和 PDFBox 现取文本；普通 MinIO 对象名仍走原逻辑。

### 拆分规则

- **EPUB**：复用 `/epub/manifest` 的 spine 顺序；标题优先取 EPUB3 nav / NCX 目录，其次
  XHTML `<title>`，最后「第 N 章」。单个 XHTML 内再用
  `第X章/回/节/卷`、`Chapter N`、`PART`、`序章/前言/后记/尾声` 二次切分；
  目录页（标题很多且每段极短）会被识别并跳过切分。
- **PDF**：`PDFTextStripper` 按行收集文本 + 字号，标题判定 = 章节正则，或
  「字号 ≥ 正文 ×1.15 + 行短 + 不以句末标点结尾」；同页相邻标题行合并。
  识别不到标题时按 `book.chapters.pdf-fallback-pages`（默认 10）页一章兜底；
  扫描版 PDF（文本量过低）不生成假章节。
- 去重 / 幂等：重建前删除该书所有 `epub://` / `pdf://` 章节，用户手工新增的章节保留。

### 触发方式

- 上传表单与在线详情上传都有 **「同时生成章节」** 开关（默认开），对应
  `BookImportRequest.generateChapters` / `ProviderImportRequest.generateChapters`。
- 详情页文件块有 **「生成章节 / 重建章节」** 按钮，调 `chapters/rebuild`。
- BookDrop 自动入库时也会生成章节。
- 删除图书文件时，`epub://` / `pdf://` 章节一并清理，`chapter_count` 归零。

### 配置

```yaml
book:
  chapters:
    pdf-fallback-pages: 10   # 0 = 只生成「全文」一章
    max-chapters: 2000
    min-text-length: 50
```

### 阅读行为

- 阅读页默认仍走文件阅读器（EPUB 排版 / 图片、PDF 原生、CBZ 逐页）。
- 从详情点「阅读本章」会带 `chapterId`，此时改走章节正文阅读器（指针正文可读）；
  逐章收藏、字数统计也因此可用。
- **阅读进度**：`lib/readingProgress.ts` 记录章节 id / EPUB spine 下标 / CBZ 页码，
  图书详情据此显示「继续阅读」并跳回上次位置（PDF 走浏览器原生查看器，暂不记页码）。
