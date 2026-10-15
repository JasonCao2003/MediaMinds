/** 将后端分页响应归一化为 { rows, total } */
export function normalizePage<T>(res: unknown): { rows: T[]; total: number } {
  const d = (res as { data?: unknown })?.data ?? res;
  if (!d || typeof d !== 'object') return { rows: [], total: 0 };
  const obj = d as { records?: T[]; list?: T[]; total?: number };
  const rows = obj.records ?? obj.list ?? (Array.isArray(d) ? (d as T[]) : []);
  const total = obj.total ?? rows.length;
  return { rows, total };
}

/** 将下划线字段（如 release_date）映射为 camelCase，便于 React 使用 */
export function toCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = v;
  });
  return out;
}
