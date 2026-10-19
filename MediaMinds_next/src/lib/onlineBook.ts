/**
 * 在线书源搜索结果的归一化。
 *
 * <p>各书源返回的字段结构不同（Google 用 `authors[]` / `publishedDate`，豆瓣用 `author` / `pubdate`，
 * OpenLibrary 用 `author_name` / `first_publish_year` / `cover_i`，评分还可能是对象），
 * 这里统一成一份结构，供在线结果面板与「上传后补全元信息」两处复用。
 *
 * <p>既兼容各源自己的搜索接口，也兼容阶段 3 的统一接口 `/v1/book/metadata/search`
 * （后者的字段已由后端归一化过）。
 */

export type OnlineBookSource = 'google' | 'douban' | 'openlibrary';

export interface OnlineBookSummary {
  id: string;
  source: OnlineBookSource;
  title: string;
  subtitle?: string;
  author: string;
  publisher?: string;
  /** yyyy-MM-dd（能解析时） */
  publishedDate?: string;
  /** 展示用的四位年份 */
  year: string;
  description?: string;
  cover?: string;
  pageCount?: number;
  rating: number;
  reviewCount?: number;
}

const asText = (v: unknown) => (v == null ? '' : String(v).trim());

/** 把 "2021" / "2021-3" / "2021/3/5" 统一成 yyyy-MM-dd；认不出返回空串 */
export function normalizeDateInput(raw?: unknown): string {
  const value = asText(raw).replace(/[/.]/g, '-');
  const match = value.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2] ?? 1);
  const day = Number(match[3] ?? 1);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${match[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 评分可能是数字，也可能是 `{ value, count }`（豆瓣） */
function ratingOf(raw: Record<string, unknown>): { value: number; count: number } {
  const rating = raw.rating;
  if (rating && typeof rating === 'object') {
    const obj = rating as { value?: unknown; count?: unknown };
    return { value: Number(obj.value) || 0, count: Number(obj.count) || Number(raw.ratingCount) || 0 };
  }
  const value = Number(rating) || Number(raw.ratings_average) || 0;
  const count = Number(raw.ratingCount) || Number(raw.ratings_count) || 0;
  return { value, count };
}

/** 数组取第一个非空字符串；非数组原样返回 */
function firstOf(value: unknown): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = asText(item);
      if (text) return text;
    }
    return '';
  }
  return asText(value);
}

/** 豆瓣搜索结果的 abstract 形如「作者 / 出版社 / 出版年」，按需拆出兜底字段 */
function splitDoubanAbstract(raw: Record<string, unknown>) {
  const text = asText(raw.abstract);
  if (!text) return { author: '', publisher: '', pubdate: '' };
  const parts = text.split(/\s*\/\s*/);
  return {
    author: parts[0] ?? '',
    publisher: parts[1] ?? '',
    pubdate: parts[2] ?? '',
  };
}

function coverOf(raw: Record<string, unknown>): string {
  const direct =
    asText(raw.cover) || asText(raw.cover_url) || asText(raw.pic) || asText(raw.image);
  if (direct) return direct;
  const coverId = Number(raw.cover_i) || 0;
  return coverId > 0 ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '';
}

export function normalizeOnlineBook(
  raw: Record<string, unknown>,
  source: OnlineBookSource,
): OnlineBookSummary {
  const rawAuthors = raw.authors;
  const authors = Array.isArray(rawAuthors)
    ? rawAuthors.map((a) => asText(a)).filter(Boolean).join(' / ')
    : asText(rawAuthors);
  const authorName = Array.isArray(raw.author_name)
    ? raw.author_name.map((a) => asText(a)).filter(Boolean).join(' / ')
    : asText(raw.author_name);

  const doubanParts = source === 'douban' ? splitDoubanAbstract(raw) : null;
  const pubdate =
    asText(raw.pubdate) ||
    asText(raw.publishedDate) ||
    asText(raw.first_publish_date) ||
    asText(raw.year) ||
    (Number(raw.first_publish_year) ? `${raw.first_publish_year}-01-01` : '') ||
    doubanParts?.pubdate ||
    '';
  const publishedDate = normalizeDateInput(pubdate);
  const pageCount = Number(raw.pageCount ?? raw.number_of_pages_median);

  // 豆瓣搜索的 abstract 是「作者 / 出版社 / 年份」，不是简介，不能当 description 用
  const description =
    source === 'douban' ? '' : asText(raw.description) || asText(raw.abstract) || '';

  return {
    // 豆瓣 id 是数字，Google id 是 volumeId，OpenLibrary 是 OL...W——一律按字符串处理
    id: asText(raw.id) || asText(raw.key).replace(/^\/works\//, ''),
    source,
    title: asText(raw.title) || asText(raw.name) || '未命名',
    subtitle: asText(raw.subtitle) || undefined,
    author: asText(raw.author) || authors || authorName || doubanParts?.author || '',
    publisher: firstOf(raw.publisher) || doubanParts?.publisher || undefined,
    publishedDate: publishedDate || undefined,
    year: pubdate.length >= 4 ? pubdate.slice(0, 4) : publishedDate.slice(0, 4),
    description: description || undefined,
    cover: coverOf(raw) || undefined,
    pageCount: pageCount > 0 ? pageCount : undefined,
    rating: ratingOf(raw).value,
    reviewCount: ratingOf(raw).count || undefined,
  };
}

/**
 * 在线元信息 → 图书表单补丁。
 *
 * <p>只放**非空**值：用户已经手填的内容不会被空字段冲掉。
 */
export function onlineMetadataPatch(book: OnlineBookSummary): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const put = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && !value.trim()) return;
    patch[key] = value;
  };

  if (book.title && book.title !== '未命名') put('bookName', book.title);
  put('subtitle', book.subtitle);
  put('bookAuthor', book.author);
  put('publisher', book.publisher);
  put('publishedDate', book.publishedDate);
  put('bookDetails', book.description);
  put('bookImg', book.cover);
  put('pageCount', book.pageCount);
  return patch;
}
