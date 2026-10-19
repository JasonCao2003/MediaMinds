import type { FormField } from '@/components/manage/FormDialog';

/**
 * 影片表单的字段 schema 与取值规整。
 *
 * <p>「新建」在浏览页、「编辑」在详情页，两处共用这一份，避免字段定义漂移。
 */

/** 地区 / 语言编码（与后端 `TmdbService.resolveArea` / `resolveLanguage` 一致） */
export const AREA_OPTIONS = [
  { label: '中国大陆', value: 0 },
  { label: '中国香港', value: 1 },
  { label: '其他地区', value: 2 },
  { label: '美国', value: 3 },
];

export const LANGUAGE_OPTIONS = [
  { label: '中文', value: 0 },
  { label: '英语', value: 1 },
  { label: '粤语', value: 2 },
  { label: '其他语言', value: 3 },
];

/**
 * `movie` 表里 `name` / `directed_by` / `actor` / `language` 都是 NOT NULL，故设为必填。
 * 简介写进 `info`（varchar 1280）；`abs` 只有 128，留给数据源导入的短标语。
 */
export const MOVIE_FIELDS: FormField[] = [
  { name: 'name', label: '片名', required: true, maxLength: 64 },
  { name: 'directedBy', label: '导演', required: true, maxLength: 64 },
  { name: 'actor', label: '主演', required: true, maxLength: 512, helperText: '多个演员用逗号分隔' },
  { name: 'language', label: '语言', type: 'select', required: true, options: LANGUAGE_OPTIONS },
  { name: 'area', label: '地区', type: 'select', options: AREA_OPTIONS },
  { name: 'type', label: '类型', maxLength: 128, helperText: '如：剧情,科幻' },
  { name: 'time', label: '时长（分钟）', type: 'number' },
  { name: 'rate', label: '评分', type: 'number', helperText: '0 ~ 10' },
  { name: 'showTime', label: '上映日期', helperText: '格式 YYYY-MM-DD' },
  { name: 'info', label: '简介', type: 'textarea', rows: 4, maxLength: 1280 },
  { name: 'picture', label: '海报', type: 'image', accept: 'image/*' },
];

/** 影片记录 → 表单初始值（编辑时用） */
export function movieFormInitial(movie: Record<string, unknown>): Record<string, unknown> {
  const showTime = movie.showTime ? String(movie.showTime) : '';
  return {
    name: movie.name ?? movie.movieName ?? '',
    directedBy: movie.directedBy ?? movie.director ?? '',
    actor: movie.actor ?? movie.actors ?? '',
    language: movie.language ?? '',
    area: movie.area ?? '',
    type: movie.type ?? '',
    time: movie.time ?? '',
    rate: movie.rate ?? '',
    // 后端是 LocalDateTime，表单里只保留日期部分
    showTime: showTime ? showTime.slice(0, 10) : '',
    info: movie.info ?? movie.abs ?? '',
    // 表单里的封面字段名是 picture（与实体一致）
    picture: movie.picture ?? movie.pic ?? movie.cover ?? '',
  };
}

/**
 * 表单值 → 后端 payload。
 *
 * <p>空串一律删键（不写 null）；数值字段转数字；`showTime` 补上 `T00:00:00`，
 * 因为后端字段是 `LocalDateTime`，只给日期会解析失败。
 */
export function toMoviePayload(
  values: Record<string, unknown>,
  opts: { id?: number; source?: string } = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...values };

  for (const k of ['time', 'rate', 'area', 'language']) {
    if (payload[k] === '' || payload[k] == null) delete payload[k];
    else payload[k] = Number(payload[k]);
  }

  const st = payload.showTime;
  if (typeof st === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(st.trim())) {
    payload.showTime = `${st.trim()}T00:00:00`;
  } else if (st === '' || st == null) {
    delete payload.showTime;
  }

  payload.source = opts.source ?? 'manual';
  if (opts.id != null) payload.id = opts.id;
  return payload;
}
