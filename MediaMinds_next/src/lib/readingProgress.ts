'use client';

/**
 * 图书阅读进度（本地记录）。
 *
 * <p>章节正文阅读器存 `chapterId`；文件阅读器存 EPUB 的 `chapterIndex` /
 * CBZ 的 `page`。图书页据此把「开始阅读」显示成「继续阅读」。
 *
 * <p>旧的 `mm_reader_progress`（`{ bookId: chapterId }`）会在读取时兼容迁移。
 */
export interface ReadingProgress {
  /** 章节正文阅读器：book_chapter.id */
  chapterId?: number;
  /** EPUB 文件阅读器：spine 下标（0 基） */
  chapterIndex?: number;
  /** CBZ 文件阅读器：页下标（0 基） */
  page?: number;
  chapterTitle?: string;
  /** 上次用的是哪种阅读模式，决定「继续阅读」往哪儿跳 */
  mode?: 'chapter' | 'file';
  updatedAt: number;
}

const KEY = 'mm_reading_progress_v1';
/** 旧版本使用的 key，形如 { bookId: chapterId } */
const LEGACY_KEY = 'mm_reader_progress';

function readStore(): Record<string, ReadingProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReadingProgress>) : {};
  } catch {
    return {};
  }
}

export function getReadingProgress(bookId: string | number): ReadingProgress | null {
  const id = String(bookId);
  const saved = readStore()[id];
  if (saved) return saved;

  // 兼容旧 key
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const legacy = JSON.parse(raw) as Record<string, number>;
    const chapterId = legacy[id];
    return chapterId ? { chapterId, updatedAt: 0 } : null;
  } catch {
    return null;
  }
}

export function saveReadingProgress(bookId: string | number, patch: Partial<ReadingProgress>): void {
  if (typeof window === 'undefined') return;
  const id = String(bookId);
  const store = readStore();
  store[id] = { ...(store[id] ?? { updatedAt: 0 }), ...patch, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* 隐私模式 / 配额满：静默忽略，不影响阅读 */
  }
}
