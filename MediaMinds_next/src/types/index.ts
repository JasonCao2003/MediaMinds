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

