/** 通用分页响应结构（后端 MyBatis-Plus 风格） */
export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages?: number;
}

export interface PageQuery {
  page?: number;
  size?: number;
  [key: string]: unknown;
}

export interface Book {
  id?: number;
  bookName?: string;
  title?: string;
  author?: string;
  bookAuthor?: string;
  typeId?: number;
  typeName?: string;
  cover?: string;
  bookImg?: string;
  description?: string;
  bookDetails?: string;
  chapterCount?: number;
  source?: string;
}

export interface BookType {
  id?: number;
  typeName?: string;
  [key: string]: unknown;
}

export interface Chapter {
  id?: number;
  bookId?: number;
  chapterName?: string;
  chapterNum?: number;
  chapterNumber?: number;
  chapterTitle?: string;
  wordCount?: number;
  contentPath?: string;
  createTime?: string;
  content?: string;
}

export interface Movie {
  id?: number;
  name?: string;
  movieName?: string;
  directedBy?: string;
  director?: string;
  actor?: string;
  actors?: string;
  cover?: string;
  pic?: string;
  videoUrl?: string;
  description?: string;
  categoryId?: number;
  type?: string;
  time?: number;
  rate?: number;
  area?: string;
  language?: string;
  showTime?: string;
  abs?: string;
  info?: string;
  watchProgress?: number;
  watchTime?: number;
}

export interface Song {
  id?: number;
  songName?: string;
  singerId?: number;
  singerName?: string;
  cover?: string;
  songUrl?: string;
  lyrics?: string;
  [key: string]: unknown;
}

export interface Singer {
  id?: number;
  singerName?: string;
  sex?: string;
  avatar?: string;
  [key: string]: unknown;
}

export interface SongList {
  id?: number;
  title?: string;
  style?: string;
  img?: string;
  introduction?: string;
  [key: string]: unknown;
}


// =============== 媒体消费时长统计 ===============

/** 某个时间范围的三类时长（秒） */
export interface ActivityRange {
  total: number;
  book: number;
  music: number;
  video: number;
}

/** 单日时长明细 */
export interface ActivityDay {
  date: string;
  book: number;
  music: number;
  video: number;
  total: number;
}

/** 时长汇总（对应 GET /v1/auth/activity/summary） */
export interface ActivitySummary {
  today: ActivityRange;
  week: ActivityRange;
  month: ActivityRange;
  year: ActivityRange;
  all: ActivityRange;
  daily: ActivityDay[];
  years: number[];
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  firstActiveDate?: string | null;
}

/** 年度聚合（对应 GET /v1/auth/activity/annual） */
export interface ActivityAnnual {
  year: number;
  totalSeconds: number;
  bookSeconds: number;
  musicSeconds: number;
  videoSeconds: number;
  activeDays: number;
  longestStreak: number;
  firstActiveDate?: string | null;
  busiestDay?: string | null;
  busiestDaySeconds: number;
  busiestMonth: number;
  busiestMonthSeconds: number;
  monthlySeconds: number[];
  daily: ActivityDay[];
}

/** 年度报告的一个板块 */
export interface AnnualReportSection {
  heading: string;
  body: string;
}

/** 年度报告（对应 POST /v1/agent/report） */
export interface AnnualReport {
  year: number;
  engine: 'langchain4j' | 'rule' | string;
  model: string;
  headline?: string | null;
  sections: AnnualReportSection[];
  rawText?: string | null;
  error?: string | null;
  /** 最近一次生成时间（从库里读出来时才有） */
  updatedAt?: string | null;
}

/** 媒体类型 */
export type MediaType = 'book' | 'music' | 'video';
