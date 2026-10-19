/** 秒 → 「12 小时 40 分」 */
export function humanDuration(seconds?: number | null): string {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s <= 0) return '0 分钟';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h} 小时 ${m} 分`;
  if (h > 0) return `${h} 小时`;
  if (m > 0) return `${m} 分钟`;
  return '不到 1 分钟';
}

/** 秒 → 「12.7h」紧凑形式（图表 / 小标签用） */
export function compactDuration(seconds?: number | null): string {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s <= 0) return '0';
  if (s < 60) return `${s}s`;
  const minutes = s / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
}

/** 字节数 → 「1.2 MB」 */
export function humanFileSize(bytes?: number | null): string {
  const size = Math.max(0, Number(bytes) || 0);
  if (size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** yyyy-MM-dd → 「3 月 8 日」 */
export function friendlyDate(date?: string | null): string {
  if (!date) return '—';
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  return `${Number(parts[1])} 月 ${Number(parts[2])} 日`;
}

// ── 影视的地区 / 语言编码 ─────────────────────────────────────────────
// 后端存的是 int 编码（见 video-service 的 TmdbService.resolveArea / resolveLanguage），
// 直接渲染会显示成「3」「1」，这里统一转成文案。

const AREA_LABELS: Record<number, string> = {
  0: '中国大陆',
  1: '中国香港',
  2: '其他地区',
  3: '美国',
};

const LANGUAGE_LABELS: Record<number, string> = {
  0: '中文',
  1: '英语',
  2: '粤语',
  3: '其他语言',
};

/** 地区码 → 文案；未知码返回空串（调用方据此决定是否渲染） */
export function areaLabel(code?: string | number | null): string {
  if (code === undefined || code === null || code === '') return '';
  return AREA_LABELS[Number(code)] ?? '';
}

/** 语言码 → 文案；未知码返回空串 */
export function languageLabel(code?: string | number | null): string {
  if (code === undefined || code === null || code === '') return '';
  return LANGUAGE_LABELS[Number(code)] ?? '';
}

// ── 数据来源标注 ────────────────────────────────────────────────────
/**
 * 短代码 → 可读文案。
 *
 * <p>注意：书源（Google Books / 豆瓣 / Project Gutenberg）写入的**本身就是可读文案**，
 * 不在表里、原样透传即可；这里是兜住 agent-service 等写入短代码的情况
 * （音乐 `kugou`、影视 `tmdb`）以及前端手动新建的 `manual`。
 */
const SOURCE_LABELS: Record<string, string> = {
  manual: '手动添加',
  kugou: '酷狗音乐',
  tmdb: 'TMDB',
  google: 'Google Books',
  douban: '豆瓣',
  gutenberg: 'Project Gutenberg',
};

/** 数据来源 → 展示名；未收录的来源原样返回（不隐藏），空值给「—」 */
export function sourceLabel(source?: string | null): string {
  if (!source) return '—';
  return SOURCE_LABELS[source] ?? source;
}
