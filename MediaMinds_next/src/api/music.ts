import request, { type ApiResult } from '@/lib/request';
import type { PageResult, Song, Singer, SongList } from '@/types';

/**
 * 将 Vue 版统一的 { page, size } 分页语义转换为后端期望的
 * { pageNum, pageSize }（MyBatis-Plus 风格）。
 */
function normalizePage(params: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = { ...params };
  if (out.page !== undefined) {
    out.pageNum = out.page;
    delete out.page;
  }
  if (out.size !== undefined) {
    out.pageSize = out.size;
    delete out.size;
  }
  return out;
}

// ================== 歌曲管理 ==================

export const getAllSongsService = (params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Song>>>('/v1/music/songs', { params: normalizePage(params) });

export const getSongByIdService = (id: number | string) =>
  request.get<ApiResult<Song>>(`/v1/music/songs/${id}`);

export const getSongByNameService = (name: string, params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Song>>>('/v1/music/songs/bySongName', {
    params: normalizePage({ name, ...params }),
  });

export const getSongsBySingerNameService = (name: string, params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Song>>>('/v1/music/songs/bySingerName', {
    params: normalizePage({ name, ...params }),
  });

export const getSongsBySingerIdService = (
  singerId: number | string,
  params: Record<string, unknown> = {},
) =>
  request.get<ApiResult<PageResult<Song>>>(`/v1/music/songs/bySinger/${singerId}`, {
    params: normalizePage(params),
  });

export const addSongService = (songData: Record<string, unknown>, file?: File) => {
  const formData = new FormData();
  formData.append('song', JSON.stringify(songData));
  if (file) formData.append('file', file);
  // 后端返回的是新建的实体（含自增 id），前端随后要用它上传封面
  return request.post<ApiResult<Song>>('/v1/music/songs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateSongService = (id: number | string, songData: Record<string, unknown>) =>
  request.put<ApiResult<void>>(`/v1/music/songs/${id}`, songData);

export const deleteSongService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/music/songs/${id}`);

export const uploadSongFileService = (id: number | string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<ApiResult<string>>(`/v1/music/songs/${id}/file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadSongCoverService = (id: number | string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<ApiResult<string>>(`/v1/music/songs/${id}/cover`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ================== 歌手管理 ==================

export const getAllSingersService = (params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Singer>>>('/v1/music/singer', {
    params: normalizePage(params),
  });

export const getSingersBySexService = (sex: string, params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Singer>>>('/v1/music/singer/bySex', {
    params: normalizePage({ sex, ...params }),
  });

export const getSingersByNameService = (name: string, params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Singer>>>('/v1/music/singer/byName', {
    params: normalizePage({ name, ...params }),
  });

export const addSingerService = (data: Partial<Singer>) =>
  request.post<ApiResult<Singer>>('/v1/music/singer', data);

export const updateSingerService = (data: Partial<Singer>) =>
  request.put<ApiResult<void>>('/v1/music/singer', data);

export const deleteSingerService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/music/singer/${id}`);

export const uploadSingerAvatarService = (id: number | string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<ApiResult<string>>(`/v1/music/singer/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ================== 歌单管理 ==================

export const getAllSongListsService = (params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<SongList>>>('/v1/music/song-list', {
    params: normalizePage(params),
  });

export const getSongListByLikeTitleService = (
  title: string,
  params: Record<string, unknown> = {},
) =>
  request.get<ApiResult<PageResult<SongList>>>('/v1/music/song-list/like-title', {
    params: normalizePage({ title, ...params }),
  });

export const getSongListByStyleService = (style: string, params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<SongList>>>('/v1/music/song-list/style', {
    params: normalizePage({ style, ...params }),
  });

export const addSongListService = (data: Partial<SongList>) =>
  request.post<ApiResult<SongList>>('/v1/music/song-list', data);

export const updateSongListService = (id: number | string, data: Partial<SongList>) =>
  request.put<ApiResult<void>>(`/v1/music/song-list/${id}`, data);

export const deleteSongListService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/music/song-list/${id}`);

export const updateSongListCoverService = (id: number | string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<ApiResult<string>>(`/v1/music/song-list/${id}/img`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ================== 歌单歌曲管理 ==================

export const getAllListSongService = (params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Record<string, unknown>>>>('/v1/music/listSong/page', { params: normalizePage(params) });

export const getListSongBySongListIdService = (
  songListId: number | string,
  params: Record<string, unknown> = {},
) =>
  request.get<ApiResult<PageResult<Record<string, unknown>>>>('/v1/music/listSong/bySongListId', {
    params: normalizePage({ songListId, ...params }),
  });

export const addListSongService = (data: Record<string, unknown>) =>
  request.post<ApiResult<unknown>>('/v1/music/listSong', data);

export const updateListSongService = (data: Record<string, unknown>) =>
  request.put<ApiResult<unknown>>('/v1/music/listSong', data);

export const deleteListSongService = (id: number | string) =>
  request.delete<ApiResult<unknown>>(`/v1/music/listSong/${id}`);

/** 把某首歌从指定歌单移除（只影响这个歌单） */
export const removeSongFromSongListService = (
  songListId: number | string,
  songId: number | string,
) =>
  request.delete<ApiResult<unknown>>('/v1/music/listSong/remove', {
    params: { songListId, songId },
  });

// ================== 评论管理 ==================

export const getCommentsService = (params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Record<string, unknown>>>>('/v1/music/comments/page', { params: normalizePage(params) });

export const getCommentByIdService = (id: number | string) =>
  request.get<ApiResult<Record<string, unknown>>>(`/v1/music/comments/${id}`);

export const addCommentService = (data: Record<string, unknown>) =>
  request.post<ApiResult<unknown>>('/v1/music/comments', data);

export const updateCommentService = (id: number | string, data: Record<string, unknown>) =>
  request.put<ApiResult<unknown>>(`/v1/music/comments/${id}`, data);

export const deleteCommentService = (id: number | string) =>
  request.delete<ApiResult<unknown>>(`/v1/music/comments/${id}`);

export const likeCommentService = (id: number | string) =>
  request.patch<ApiResult<unknown>>(`/v1/music/comments/${id}/like`);

// ================== 收藏管理 ==================

export const getUserCollectionsService = (params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Record<string, unknown>>>>('/v1/music/collections', { params: normalizePage(params) });

export const getAllCollectionsService = (params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Record<string, unknown>>>>('/v1/music/collections/all', { params: normalizePage(params) });

export const addCollectionService = (type: string, songId?: number, songListId?: number) => {
  const params: Record<string, unknown> = { type };
  if (type === '0' && songId) params.songId = songId;
  if (type === '1' && songListId) params.songListId = songListId;
  return request.post<ApiResult<unknown>>('/v1/music/collections', null, { params });
};

export const updateCollectionService = (id: number | string, type: string, songId: number) =>
  request.put<ApiResult<unknown>>(`/v1/music/collections/${id}`, null, { params: { type, songId } });

export const deleteCollectionService = (songId: number | string) =>
  request.delete<ApiResult<unknown>>(`/v1/music/collections/${songId}`);

// ================== 歌单评分 ==================

export const getRankBySongListIdService = (songListId: number | string) =>
  request.get<ApiResult<unknown>>(`/v1/music/rank/${songListId}`);

export const addRankService = (data: Record<string, unknown>) =>
  request.post<ApiResult<unknown>>('/v1/music/rank', data);

