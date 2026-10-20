'use client';

/**
 * 阅读器划线 / 笔记（本地记录）。
 *
 * <p>偏移量是相对于「本章正文」的全局字符下标：章节正文用段落 join('\n')，
 * EPUB 用 iframe body 的纯文本。文件名阅读器的标注与阅读进度一样存 localStorage，
 * 换浏览器或清缓存会丢，但不需要额外建表，符合单机自用的定位。
 */
export type AnnotationColor = 'yellow' | 'red' | 'green' | 'blue';

export interface ReaderAnnotation {
  id: string;
  /** 相对本章正文的起始下标 */
  start: number;
  /** 结束下标（不含） */
  end: number;
  /** 选中的原文，便于校验与展示 */
  quote: string;
  color?: AnnotationColor;
  note?: string;
  createdAt: number;
}

export const ANNOTATION_COLORS: Record<AnnotationColor, { label: string; css: string }> = {
  yellow: { label: '黄色', css: 'color-mix(in srgb, var(--mm-yellow) 48%, transparent)' },
  red: { label: '红色', css: 'color-mix(in srgb, var(--mm-red) 26%, transparent)' },
  green: { label: '绿色', css: 'color-mix(in srgb, var(--mm-success) 30%, transparent)' },
  blue: { label: '蓝色', css: 'color-mix(in srgb, var(--mm-blue) 22%, transparent)' },
};

const KEY = 'mm_reader_annotations_v1';

type AnnotationStore = Record<string, ReaderAnnotation[]>;

function readStore(): AnnotationStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as AnnotationStore) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: AnnotationStore) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* 隐私模式 / 配额满：静默忽略，不影响阅读 */
  }
}

export function getAnnotations(key: string): ReaderAnnotation[] {
  if (!key) return [];
  return (readStore()[key] ?? []).slice().sort((a, b) => a.start - b.start);
}

export function addAnnotation(
  key: string,
  input: Omit<ReaderAnnotation, 'id' | 'createdAt'>,
): ReaderAnnotation[] {
  if (!key || input.end <= input.start) return getAnnotations(key);
  const store = readStore();
  const list = store[key] ?? [];

  // 同一段文字、同一种颜色 / 同一条笔记不重复添加
  const duplicate = list.some(
    (a) =>
      a.start === input.start &&
      a.end === input.end &&
      a.color === input.color &&
      (a.note ?? '') === (input.note ?? ''),
  );
  if (!duplicate) {
    list.push({
      ...input,
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    });
    store[key] = list;
    writeStore(store);
  }
  return list.slice().sort((a, b) => a.start - b.start);
}

/** 删除与选区有交集的标注（用于「清除标记」） */
export function removeAnnotationsInRange(key: string, start: number, end: number): ReaderAnnotation[] {
  if (!key) return [];
  const store = readStore();
  const list = (store[key] ?? []).filter((a) => a.end <= start || a.start >= end);
  store[key] = list;
  writeStore(store);
  return list.slice().sort((a, b) => a.start - b.start);
}

export function removeAnnotation(key: string, id: string): ReaderAnnotation[] {
  if (!key) return [];
  const store = readStore();
  const list = (store[key] ?? []).filter((a) => a.id !== id);
  store[key] = list;
  writeStore(store);
  return list.slice().sort((a, b) => a.start - b.start);
}
