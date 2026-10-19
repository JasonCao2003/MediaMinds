'use client';

/**
 * 「最近观看 / 最近收听」的本地记录。
 *
 * 后端只有影视有观看记录表（`user_video_interaction`），图书与音乐都没有；
 * 这里统一用 localStorage 存一份**卡片快照**——好处是渲染最近列表时
 * 不需要再按 id 逐个回查接口（否则会变成 N+1 请求）。
 *
 * 代价：换浏览器或清缓存会丢。对单机自用的场景够用。
 */

export type RecentKind = 'book' | 'music' | 'video';

export interface RecentItem {
  /** 业务主键，统一按字符串比较，避免 number / string 混用 */
  id: string;
  title: string;
  subtitle?: string;
  cover?: string;
  /** 最近一次消费的时间戳 */
  at: number;
}

const STORAGE_KEY = 'mm-recent';

/** 每类最多保留多少条 */
const MAX_PER_KIND = 60;

type RecentStore = Partial<Record<RecentKind, RecentItem[]>>;

function readStore(): RecentStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RecentStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: RecentStore) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 隐私模式或配额已满：静默忽略，不影响正常使用 */
  }
}

/**
 * 记录一次消费。
 * 同一条会被**移到最前面**而不是重复插入，所以「最近」列表天然去重。
 *
 * `id` 允许传 number（后端主键多为数字），内部统一转字符串比较。
 */
export function pushRecent(
  kind: RecentKind,
  item: { id: string | number; title: string; subtitle?: string; cover?: string },
) {
  if (!item || item.id === undefined || item.id === null || item.id === '') return;

  const store = readStore();
  const id = String(item.id);
  const list = (store[kind] ?? []).filter((i) => i.id !== id);

  list.unshift({
    id,
    title: item.title || '未命名',
    subtitle: item.subtitle || undefined,
    cover: item.cover || undefined,
    at: Date.now(),
  });

  store[kind] = list.slice(0, MAX_PER_KIND);
  writeStore(store);
}

/** 读取某一类的最近记录（已按时间倒序） */
export function getRecent(kind: RecentKind): RecentItem[] {
  return readStore()[kind] ?? [];
}

/** 清空某一类的记录 */
export function clearRecent(kind: RecentKind) {
  const store = readStore();
  delete store[kind];
  writeStore(store);
}

/**
 * 删除某一条记录。
 *
 * <p>内容本体被删除后，本地的「最近观看 / 播放」快照不会自动消失；
 * 打开详情或删除时发现 404，就用它把残留项清掉。
 */
export function removeRecent(kind: RecentKind, id: string | number) {
  const target = String(id);
  const store = readStore();
  const list = store[kind];
  if (!list || list.length === 0) return;
  const next = list.filter((item) => item.id !== target);
  if (next.length === list.length) return;
  store[kind] = next;
  writeStore(store);
}

/** 时间戳 → 「刚刚 / 3 分钟前 / 2 天前 / 10 月 16 日」 */
export function relativeTime(at: number): string {
  const diff = Date.now() - at;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  const d = new Date(at);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}
