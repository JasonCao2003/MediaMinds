/**
 * 歌词解析。
 *
 * <p>支持两种常见格式：
 * <ul>
 *   <li>酷狗 KRC 式逐字歌词：{@code [start,duration]<offset,duration,?>字...}（毫秒）</li>
 *   <li>标准 LRC：{@code [mm:ss.xx]文本}（一行可有多个时间标签）</li>
 * </ul>
 * 元信息行（{@code [ti:]} / {@code [ar:]} / {@code [hash:]} / {@code [offset:]} 等）会被忽略。
 */
export interface LyricLine {
  /** 起始时间（秒）；无时间标签的行是 -1 */
  time: number;
  text: string;
}

const KRC_LINE = /^\[(\d+),(\d+)\](.*)$/;
const LRC_TAG = /\[(\d{1,3}):(\d{1,2}(?:\.\d{1,3})?)\]/g;
const WORD_TAG = /<\d+,\d+,\d+>/g;

/** 去掉 KRC 的逐字标签，保留文字 */
function stripWordTags(text: string): string {
  return text.replace(WORD_TAG, '').replace(/\s+/g, ' ').trim();
}

export function parseLyrics(raw?: string | null): LyricLine[] {
  if (!raw) return [];
  const timed: LyricLine[] = [];
  const untimed: LyricLine[] = [];

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const krc = line.match(KRC_LINE);
    if (krc) {
      const time = Number(krc[1]) / 1000;
      const text = stripWordTags(krc[3]);
      if (text) timed.push({ time, text });
      continue;
    }

    // 一行可能有多个 [mm:ss.xx] 标签
    const tags = Array.from(line.matchAll(LRC_TAG));
    if (tags.length > 0) {
      const text = stripWordTags(line.replace(/\[[^\]]*\]/g, ''));
      if (!text) continue;
      for (const tag of tags) {
        const time = Number(tag[1]) * 60 + Number(tag[2]);
        timed.push({ time, text });
      }
      continue;
    }

    // 完全不认识的行（纯文本歌词 / 无法识别的时间标签）原样保留
    if (/^\[[^\]]*\]$/.test(line)) continue; // 纯标签行（元信息）丢掉
    untimed.push({ time: -1, text: stripWordTags(line) });
  }

  timed.sort((a, b) => a.time - b.time);
  return [...timed, ...untimed];
}

/** 当前时间对应的歌词行下标；找不到返回 -1 */
export function activeLyricIndex(lines: LyricLine[], time: number): number {
  let index = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time < 0) break;
    if (lines[i].time <= time + 0.15) index = i;
    else break;
  }
  return index;
}
