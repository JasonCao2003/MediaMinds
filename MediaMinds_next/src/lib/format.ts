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

/** yyyy-MM-dd → 「3 月 8 日」 */
export function friendlyDate(date?: string | null): string {
  if (!date) return '—';
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  return `${Number(parts[1])} 月 ${Number(parts[2])} 日`;
}
