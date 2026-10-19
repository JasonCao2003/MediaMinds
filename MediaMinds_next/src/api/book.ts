import request, { type ApiResult } from '@/lib/request';
import type { Book, BookType, Chapter, PageResult } from '@/types';

// ================== 浏览页筛选 / 排序 ==================

/** 排序字段（与后端 `BookService.applySort` 的白名单一致） */
export type BookSortField = 'createTime' | 'bookName' | 'bookAuthor' | 'chapterCount';

export type SortOrder = 'asc' | 'desc';

/** 分面里的一个选项：值 + 展示名 + 全库藏书数量 */
export interface FacetItem {
  value: string;
  label: string;
  count: number;
}

/** 左侧筛选栏的数据：三组分面 + 全库总数 */
export interface BookFacets {
  types: FacetItem[];
  authors: FacetItem[];
  sources: FacetItem[];
  total: number;
}

/** 当前的筛选条件（空数组表示该维度不筛选） */
export interface BookFilterSelection {
  typeIds: number[];
  authors: string[];
  sources: string[];
}

export const EMPTY_BOOK_FILTERS: BookFilterSelection = { typeIds: [], authors: [], sources: [] };

export const hasBookFilters = (f: BookFilterSelection) =>
  f.typeIds.length > 0 || f.authors.length > 0 || f.sources.length > 0;

// ================== 书籍管理 ==================

export const getBookListService = (
  page = 1,
  size = 10,
  params: {
    typeIds?: number[];
    authors?: string[];
    sources?: string[];
    sortField?: BookSortField;
    sortOrder?: SortOrder;
  } = {},
) => {
  // 数组用逗号分隔的字符串传递：axios 默认会序列化成 `k[]=v`，Spring 的 @RequestParam 绑定不了
  const { typeIds, authors, sources, sortField, sortOrder } = params;
  return request.get<ApiResult<PageResult<Book>>>('/v1/book/product/list', {
    params: {
      page,
      size,
      ...(typeIds?.length ? { typeIds: typeIds.join(',') } : {}),
      ...(authors?.length ? { authors: authors.join(',') } : {}),
      ...(sources?.length ? { sources: sources.join(',') } : {}),
      ...(sortField ? { sortField, sortOrder: sortOrder ?? 'desc' } : {}),
    },
  });
};

/** 左侧筛选栏的分面数据（各维度可选值 + 全库计数） */
export const getBookFacetsService = () =>
  request.get<ApiResult<BookFacets>>('/v1/book/product/facets');

// ================== 图书文件（上传 / 抽取 / 入库） ==================

/**
 * 从图书文件里本地抽取到的元数据（后端 `ExtractedMetadata`）。
 *
 * 抽不到的字段是 `null`——不编造空串，前端据此判断哪些要用户补或走在线补全。
 */
export interface ExtractedMetadata {
  bookName?: string | null;
  subtitle?: string | null;
  bookAuthor?: string | null;
  publisher?: string | null;
  /** yyyy-MM-dd */
  publishedDate?: string | null;
  bookDetails?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  pageCount?: number | null;
  language?: string | null;
  seriesName?: string | null;
  seriesNumber?: string | null;
  /** EPUB 的 spine 条目数 / CBZ 页数 / PDF 页数 */
  chapterCount?: number | null;
  hasCover?: boolean;
  /** 抽取过程的提示，如「未找到 ISBN」 */
  notes?: string[];
}

/** 暂存结果：令牌 + 抽取到的元数据 */
export interface StagingResult {
  token: string;
  fileName: string;
  /** epub / pdf / cbz */
  format: string;
  size: number;
  metadata: ExtractedMetadata;
}

/** 支持入库的文件格式 */
export const getSupportedBookFormatsService = () =>
  request.get<ApiResult<string[]>>('/v1/book/file/formats');

/**
 * 上传图书文件到暂存区并抽取元数据。
 *
 * 此时**不落库、不进对象存储**——用户确认后才调 `importBookWithFileService`。
 * 大文件上传慢，超时放宽到 5 分钟（全局默认 30s 不够）。
 */
export const stageBookFileService = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<ApiResult<StagingResult>>('/v1/book/file/staging', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
};

/** 取暂存文件的封面（按需抽取）。返回 Blob，调用方自己转 objectURL */
export const getStagingCoverService = (token: string) =>
  request.get<Blob>(`/v1/book/file/staging/${token}/cover`, { responseType: 'blob' });

/** 丢弃暂存文件（用户取消） */
export const discardStagingService = (token: string) =>
  request.delete<ApiResult<void>>(`/v1/book/file/staging/${token}`);

/** 入口②：直接上传——用暂存文件 + 表单里的元数据入库 */
export const importBookWithFileService = (
  token: string,
  book: Partial<Book>,
  useExtractedCover = true,
  generateChapters = true,
) =>
  request.post<ApiResult<Book>>(
    '/v1/book/file/import',
    { token, book, useExtractedCover, generateChapters },
    { timeout: 300000 },
  );

/** 入口①：在线检索后上传——元信息由后端向在线源取，前端只给 source + id */
export const importBookFromProviderService = (
  token: string,
  source: 'google' | 'douban' | 'openlibrary',
  providerId: string,
  useExtractedCover = true,
  generateChapters = true,
) =>
  request.post<ApiResult<Book>>(
    '/v1/book/file/import-from-provider',
    {
      token,
      source,
      providerId,
      useExtractedCover,
      generateChapters,
    },
    { timeout: 300000 },
  );

/** 删除图书文件（清对象存储 + 本地缓存 + 置空文件字段） */
export const deleteBookFileService = (bookId: number | string) =>
  request.delete<ApiResult<void>>(`/v1/book/file/${bookId}`);

/** 取图书文件原始字节（PDF 用） */
export const getBookRawFileService = (bookId: number | string) =>
  request.get<Blob>(`/v1/book/file/${bookId}/raw`, { responseType: 'blob' });

/** 把当前元数据写回 EPUB 文件（阶段 5，只支持 EPUB） */
export const writeBackBookFileService = (bookId: number | string) =>
  request.post<ApiResult<string>>(`/v1/book/file/${bookId}/writeback`, null, { timeout: 300000 });

/** 从 EPUB / PDF 自动生成（重建）章节；只写指针，不复制正文 */
export interface ChapterBuildReport {
  bookId: number;
  generated: number;
  chapters: Array<{ number: number; title: string; wordCount: number }>;
  message?: string;
}

export const rebuildBookChaptersService = (bookId: number | string) =>
  request.post<ApiResult<ChapterBuildReport>>(`/v1/book/file/${bookId}/chapters/rebuild`, null, {
    timeout: 300000,
  });

// ================== 阅读（阶段 R：EPUB 资源 / CBZ 逐页） ==================

/** EPUB 目录里的一章：`path` 是它在 ZIP 内的 entry 名 */
export interface EpubChapterInfo {
  index: number;
  title?: string | null;
  path: string;
  mediaType?: string | null;
}

export interface EpubManifest {
  format: string;
  title?: string | null;
  chapters: EpubChapterInfo[];
}

export interface CbzManifest {
  format: string;
  title?: string | null;
  pageCount: number;
}

export const getEpubManifestService = (bookId: number | string) =>
  request.get<ApiResult<EpubManifest>>(`/v1/book/file/${bookId}/epub/manifest`);

/**
 * 取 EPUB 内的一个资源。
 *
 * <p>章节正文（xhtml）按文本取回由前端解析；图片 / CSS / 字体等按 Blob 取回再转
 * objectURL 喂给 iframe/`<img>`——这类请求**不带 Authorization 头**，不能直接当 `src` 用。
 */
export const getEpubResourceTextService = (bookId: number | string, path: string) =>
  request.get<string>(`/v1/book/file/${bookId}/epub/resource`, {
    params: { path },
    responseType: 'text',
  });

export const getEpubResourceBlobService = (bookId: number | string, path: string) =>
  request.get<Blob>(`/v1/book/file/${bookId}/epub/resource`, {
    params: { path },
    responseType: 'blob',
  });

export const getCbzManifestService = (bookId: number | string) =>
  request.get<ApiResult<CbzManifest>>(`/v1/book/file/${bookId}/cbz/manifest`);

export const getCbzPageService = (bookId: number | string, index: number) =>
  request.get<Blob>(`/v1/book/file/${bookId}/cbz/page/${index}`, { responseType: 'blob' });

export const getBookByIdService = (id: number | string) =>
  request.get<ApiResult<Book>>(`/v1/book/product/${id}`);

export const addBookService = (data: Partial<Book>) =>
  request.post<ApiResult<void>>('/v1/book/product', data);

export const updateBookService = (data: Partial<Book>) =>
  request.put<ApiResult<void>>('/v1/book/product', data);

export const deleteBookService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/book/product/${id}`);

/** 元数据锁定（阶段 6）：锁定后批量刷新 / BookDrop 不再自动改写 */
export const setBookMetadataLockService = (id: number | string, locked = true) =>
  request.post<ApiResult<void>>(`/v1/book/product/${id}/lock`, null, { params: { locked } });

export const updateBookCoverService = (bookId: number | string, file: File) => {
  const formData = new FormData();
  formData.append('bookId', String(bookId));
  formData.append('image', file);
  return request.put<ApiResult<string>>('/v1/book/product/cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const searchBookService = (
  keyword: string,
  page = 1,
  size = 10,
  params: {
    typeIds?: number[];
    authors?: string[];
    sources?: string[];
    sortField?: BookSortField;
    sortOrder?: SortOrder;
  } = {},
) => {
  const { typeIds, authors, sources, sortField, sortOrder } = params;
  return request.get<ApiResult<PageResult<Book>>>('/v1/book/product/search', {
    params: {
      keyword,
      page,
      size,
      ...(typeIds?.length ? { typeIds: typeIds.join(',') } : {}),
      ...(authors?.length ? { authors: authors.join(',') } : {}),
      ...(sources?.length ? { sources: sources.join(',') } : {}),
      ...(sortField ? { sortField, sortOrder: sortOrder ?? 'desc' } : {}),
    },
  });
};

export const searchBookByAuthorService = (keyword: string, page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Book>>>('/v1/book/product/search/author', {
    params: { keyword, page, size },
  });

// ================== 书籍类型 ==================

export const getAllTypesService = () =>
  request.get<ApiResult<BookType[]>>('/v1/book/type/all');

export const getTypeListService = (page = 1, size = 10) =>
  request.get<ApiResult<PageResult<BookType>>>('/v1/book/type/list', { params: { page, size } });

export const getTypeByIdService = (id: number | string) =>
  request.get<ApiResult<BookType>>(`/v1/book/type/${id}`);

export const addTypeService = (data: Partial<BookType>) =>
  request.post<ApiResult<void>>('/v1/book/type', data);

export const updateTypeService = (data: Partial<BookType>) =>
  request.put<ApiResult<void>>('/v1/book/type', data);

export const deleteTypeService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/book/type/${id}`);

// ================== 章节 ==================

export const getChapterListService = (bookId: number | string, page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Chapter>>>('/v1/book/chapter/page', {
    params: { bookId, page, size },
  });

export const getAllChaptersService = (bookId: number | string) =>
  request.get<ApiResult<Chapter[]>>('/v1/book/chapter/list', { params: { bookId } });

export const getChapterByIdService = (id: number | string) =>
  request.get<ApiResult<Chapter>>(`/v1/book/chapter/${id}`);

export const getChapterContentService = (id: number | string) =>
  request.get<ApiResult<string>>(`/v1/book/chapter/content/${id}`);

export const addChapterService = (data: Partial<Chapter>) =>
  request.post<ApiResult<void>>('/v1/book/chapter', data);

export const updateChapterService = (data: Partial<Chapter>) =>
  request.put<ApiResult<void>>('/v1/book/chapter', data);

export const deleteChapterService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/book/chapter/${id}`);

// ================== 收藏 ==================

export const getFavoriteListService = (page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Record<string, unknown>>>>('/v1/book/favorite/list', {
    params: { page, size },
  });

export const getFavoriteByIdService = (id: number | string) =>
  request.get<ApiResult<Record<string, unknown>>>(`/v1/book/favorite/${id}`);

export const addFavoriteService = (data: Record<string, unknown>) =>
  request.post<ApiResult<unknown>>('/v1/book/favorite', data);

export const deleteFavoriteService = (id: number | string) =>
  request.delete<ApiResult<unknown>>(`/v1/book/favorite/${id}`);

export const deleteFavoriteByBookService = (bookId: number | string, chapterId?: number | string) =>
  chapterId
    ? request.delete<ApiResult<unknown>>(`/v1/book/favorite/book/${bookId}/chapter/${chapterId}`)
    : request.delete<ApiResult<unknown>>(`/v1/book/favorite/book/${bookId}`);

export const getFavoriteChaptersService = (bookId: number | string, page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Record<string, unknown>>>>(`/v1/book/favorite/chapters/${bookId}`, {
    params: { page, size },
  });

// ================== 豆瓣书源 ==================

export const searchDoubanService = (query: string, page = 1) =>
  request.get('/v1/book/douban/search', { params: { query, page } });

export const getDoubanDetailService = (doubanId: number | string) =>
  request.get(`/v1/book/douban/${doubanId}`);

export const importDoubanBookService = (id: number | string) =>
  request.post('/v1/book/douban/import', null, { params: { id } });

// ================== Google Books 书源 ==================

/** 搜索图书（官方公开 API，支持翻页） */
export const searchGoogleBooksService = (query: string, page = 1) =>
  request.get('/v1/book/google/search', { params: { query, page } });

/** 图书详情（按 volumeId） */
export const getGoogleBookDetailService = (id: string) => request.get(`/v1/book/google/${id}`);

/** 导入到本地书库（仅元信息） */
export const importGoogleBookService = (id: string) =>
  request.post('/v1/book/google/import', null, { params: { id } });

// ================== 统一书源（阶段 3） ==================

/** 统一书源 id：Google Books / 豆瓣 / Gutenberg / OpenLibrary */
export type BookMetadataProviderId = 'google' | 'douban' | 'gutenberg' | 'openlibrary';

export interface BookMetadataProviderInfo {
  id: string;
  displayName: string;
  supportsImport: boolean;
}

/** 后端已注册的书源列表 */
export const getBookMetadataProvidersService = () =>
  request.get<ApiResult<BookMetadataProviderInfo[]>>('/v1/book/metadata/providers');

/** 统一搜索：`results` 的字段已由后端归一化（与 `OnlineBookSummary` 对齐） */
export const searchBookMetadataService = (provider: string, query: string, page = 1) =>
  request.get<
    ApiResult<{
      provider: string;
      page: number;
      pageSize: number;
      count: number;
      results: Array<Record<string, unknown>>;
    }>
  >('/v1/book/metadata/search', { params: { provider, query, page } });

/** 统一详情 */
export const getBookMetadataDetailService = (provider: string, id: string) =>
  request.get<ApiResult<Record<string, unknown>>>(
    `/v1/book/metadata/${provider}/${encodeURIComponent(id)}`,
  );

/** 统一导入（与各源原有 import 接口行为一致） */
export const importBookMetadataService = (provider: string, id: string) =>
  request.post<ApiResult<unknown>>('/v1/book/metadata/import', null, { params: { provider, id } });

// ================== 字段加权匹配 / 合并（阶段 4） ==================

/** 匹配候选：统一结构 + `matchScore`（0–1，越高越像同一本书） */
export type BookMetadataMatch = Record<string, unknown> & {
  id?: string | number;
  title?: string;
  matchScore?: number | null;
};

export const matchBookMetadataService = (
  provider: string,
  params: { query?: string; bookId?: number | string; size?: number },
) =>
  request.get<ApiResult<BookMetadataMatch[]>>('/v1/book/metadata/match', {
    params: { provider, ...params },
  });

/** 一个字段的合并建议 */
export interface MergeProposal {
  field: string;
  label: string;
  current?: unknown;
  proposed?: unknown;
  source?: string;
  mode: 'fill' | 'replace';
}

export interface MergePreview {
  matchScore: number;
  source: string;
  proposals: MergeProposal[];
}

/** 合并预览：只算不改，用户确认后再调 updateBookService 落库 */
export const previewBookMetadataMergeService = (
  provider: string,
  providerId: string | number,
  bookId: number | string,
) =>
  request.post<ApiResult<MergePreview>>('/v1/book/metadata/merge/preview', null, {
    params: { provider, providerId, bookId },
  });

// ================== 批量刷新 / BookDrop（阶段 6） ==================

export interface MetadataRefreshReport {
  scanned: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  items: Array<Record<string, unknown>>;
}

/** 批量刷新元数据：只填充空字段，不覆盖已有值；dryRun 只算不写 */
export const refreshBookMetadataService = (params: {
  limit?: number;
  provider?: string;
  dryRun?: boolean;
} = {}) =>
  request.post<ApiResult<MetadataRefreshReport>>('/v1/book/metadata/refresh', null, {
    params,
    timeout: 120000,
  });

export interface BookDropReport {
  dir: string;
  scanned: number;
  imported: number;
  failed: number;
  items: Array<Record<string, unknown>>;
}

/** 手动扫描 BookDrop 投递目录 */
export const scanBookDropService = () =>
  request.post<ApiResult<BookDropReport>>('/v1/book/file/drop/scan', null, { timeout: 300000 });
