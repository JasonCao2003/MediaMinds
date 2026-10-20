import request, { type ApiResult } from '@/lib/request';
import type { Movie, PageResult } from '@/types';

// ================== 电影信息管理 ==================

export const getMovieListService = (page = 1, size = 10, params: Record<string, unknown> = {}) =>
  request.get<ApiResult<PageResult<Movie>>>('/v1/video/movie/list', {
    params: { page, size, ...params },
  });

export const getMovieByIdService = (id: number | string) =>
  request.get<ApiResult<Movie>>(`/v1/video/movie/${id}`);

export const addMovieService = (data: Partial<Movie>) =>
  request.post<ApiResult<void>>('/v1/video/movie', data);

export const updateMovieService = (data: Partial<Movie>) =>
  request.put<ApiResult<void>>('/v1/video/movie', data);

export const deleteMovieService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/video/movie/${id}`);

export const updateMovieCoverService = (movieId: number | string, imageFile: File) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  return request.put<ApiResult<string>>(
    `/v1/video/movie/cover?movieId=${movieId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};

export const updateMovieVideoService = (movieId: number | string, videoFile: File) => {
  const formData = new FormData();
  formData.append('video', videoFile);
  return request.put<ApiResult<string>>(
    `/v1/video/movie/video?movieId=${movieId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};

export const searchMovieService = (
  keyword: string,
  page = 1,
  size = 10,
  params: Record<string, unknown> = {},
) =>
  request.get<ApiResult<PageResult<Movie>>>('/v1/video/movie/search', {
    params: { keyword, page, size, ...params },
  });

export const searchMovieByDirectorService = (keyword: string, page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Movie>>>('/v1/video/movie/search/director', {
    params: { keyword, page, size },
  });

export const searchMovieByActorService = (keyword: string, page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Movie>>>('/v1/video/movie/search/actor', {
    params: { keyword, page, size },
  });

// ================== 分类管理 ==================

export const getAllCategoriesService = () =>
  request.get<ApiResult<Array<{ id: number; name: string; description?: string }>>>('/v1/video/category/all');

export const getCategoryListService = (page = 1, size = 10) =>
  request.get('/v1/video/category/list', { params: { page, size } });

export const getCategoryByIdService = (id: number | string) =>
  request.get(`/v1/video/category/${id}`);

export const addCategoryService = (data: Record<string, unknown>) =>
  request.post<ApiResult<void>>('/v1/video/category', data);

export const updateCategoryService = (data: Record<string, unknown>) =>
  request.put<ApiResult<void>>('/v1/video/category', data);

export const deleteCategoryService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/video/category/${id}`);

export const getMoviesByCategoryIdService = (
  id: number | string,
  page = 1,
  size = 10,
  params: Record<string, unknown> = {},
) =>
  request.get<ApiResult<PageResult<Movie>>>(`/v1/video/category/${id}/movies`, {
    params: { page, size, ...params },
  });

// ================== 标签管理 ==================

export const getAllTagsService = () =>
  request.get<ApiResult<Record<string, unknown>[]>>('/v1/video/tag/all');

export const getTagListService = (page = 1, size = 10) =>
  request.get('/v1/video/tag/list', { params: { page, size } });

export const getTagByIdService = (id: number | string) =>
  request.get(`/v1/video/tag/${id}`);

export const addTagService = (data: Record<string, unknown>) =>
  request.post<ApiResult<void>>('/v1/video/tag', data);

export const updateTagService = (data: Record<string, unknown>) =>
  request.put<ApiResult<void>>('/v1/video/tag', data);

export const deleteTagService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/video/tag/${id}`);

export const getMoviesByTagIdService = (id: number | string, page = 1, size = 10) =>
  request.get(`/v1/video/tag/${id}/movies`, { params: { page, size } });

// ================== 评论管理 ==================

export const getCommentsByMovieIdService = (movieId: number | string, page = 1, size = 10) =>
  request.get(`/v1/video/comment/movie/${movieId}`, { params: { page, size } });

export const getMyVideoCommentsService = (page = 1, size = 10) =>
  request.get('/v1/video/comment/my', { params: { page, size } });

export const addVideoCommentService = (data: Record<string, unknown>) =>
  request.post('/v1/video/comment', data);

export const deleteVideoCommentService = (id: number | string) =>
  request.delete(`/v1/video/comment/${id}`);

// ================== 收藏管理 ==================

export const getVideoFavoriteListService = (page = 1, size = 10) =>
  request.get<ApiResult<PageResult<Movie>>>('/v1/video/favorite/list', { params: { page, size } });

export const addVideoFavoriteService = (movieId: number | string) =>
  request.post<ApiResult<unknown>>(`/v1/video/favorite/${movieId}`);

export const cancelVideoFavoriteService = (movieId: number | string) =>
  request.delete<ApiResult<unknown>>(`/v1/video/favorite/${movieId}`);

export const isVideoFavoriteService = (movieId: number | string) =>
  request.get<ApiResult<boolean>>(`/v1/video/favorite/check/${movieId}`);

// ================== 点赞管理 ==================

export const toggleLikeService = (targetId: number | string, targetType: string | number) =>
  request.post(`/v1/video/like/${targetId}/${targetType}`);

export const getLikeCountService = (targetId: number | string, targetType: string | number) =>
  request.get(`/v1/video/like/count/${targetId}/${targetType}`);

export const isLikedService = (targetId: number | string, targetType: string | number) =>
  request.get(`/v1/video/like/check/${targetId}/${targetType}`);

// ================== 观看记录 ==================

export const updateWatchRecordService = (
  movieId: number | string,
  watchTime: number,
  watchProgress: number,
) =>
  request.post(
    `/v1/video/history/record?movieId=${movieId}&watchTime=${watchTime}&watchProgress=${watchProgress}`,
  );

export const getWatchRecordService = (movieId: number | string) =>
  request.get(`/v1/video/history/record/${movieId}`);

export const getWatchHistoryService = (page = 1, size = 10) =>
  request.get('/v1/video/history/list', { params: { page, size } });

export const deleteWatchRecordService = (movieId: number | string) =>
  request.delete(`/v1/video/history/${movieId}`);

export const clearWatchHistoryService = () => request.delete('/v1/video/history/clear');

// ================== 播单 ==================

export interface VideoList {
  id?: number;
  name: string;
  description?: string;
  movieCount?: number;
  createTime?: string;
  updateTime?: string;
}

/** 用户播单列表（含每单影片数） */
export const getVideoListsService = () =>
  request.get<ApiResult<VideoList[]>>('/v1/video/list');

export const createVideoListService = (data: Partial<VideoList>) =>
  request.post<ApiResult<VideoList>>('/v1/video/list', data);

export const updateVideoListService = (id: number | string, data: Partial<VideoList>) =>
  request.put<ApiResult<VideoList>>(`/v1/video/list/${id}`, data);

export const deleteVideoListService = (id: number | string) =>
  request.delete<ApiResult<void>>(`/v1/video/list/${id}`);

/** 播单内的影片（后端按加入时间倒序返回） */
export const getVideoListItemsService = (id: number | string) =>
  request.get<ApiResult<Movie[]>>(`/v1/video/list/${id}/movies`);

export const addMovieToListService = (listId: number | string, movieId: number | string) =>
  request.post<ApiResult<void>>(`/v1/video/list/${listId}/movies/${movieId}`);

export const removeMovieFromListService = (listId: number | string, movieId: number | string) =>
  request.delete<ApiResult<void>>(`/v1/video/list/${listId}/movies/${movieId}`);

/** movieId → 包含它的播单 ID 数组 */
export const getVideoListMembershipService = () =>
  request.get<ApiResult<Record<string, number[]>>>('/v1/video/list/membership');

// ================== 第三方播放平台 ==================

export interface MovieWatchProvider {
  id: number;
  name: string;
  logo?: string;
  /** flatrate / free / ads / rent / buy */
  type: string;
  typeLabel: string;
}

export interface MovieWatchProviderGroup {
  type: string;
  label: string;
  providers: MovieWatchProvider[];
}

export interface MovieWatchProviders {
  movieId?: number;
  tmdbId?: number | null;
  region?: string;
  availableRegions?: string[];
  /** TMDB / JustWatch 的地区观看页 */
  link?: string;
  providers: MovieWatchProvider[];
  groups: MovieWatchProviderGroup[];
  note?: string;
}

/** 按本地影片 ID 查 TMDB 登记的第三方播放平台 */
export const getMovieWatchProvidersService = (movieId: number | string) =>
  request.get<ApiResult<MovieWatchProviders>>('/v1/video/tmdb/watch-providers', {
    params: { movieId },
    timeout: 60000,
  });

// ================== TMDB 在线影视 ==================

const TMDB_PREFIX = '/v1/video/tmdb';

/** 在线搜索维度：片名 / 演员 / 导演 */
export type TmdbDimension = 'title' | 'actor' | 'director';

/**
 * 按片名搜索 TMDB 影片。
 * 返回 `data.results`（TMDB 原始数组）与 `data.imageBase` / `data.posterSize`（拼海报用）。
 */
export const searchTmdbService = (query: string, page = 1) =>
  request.get<ApiResult<unknown>>(`${TMDB_PREFIX}/search`, { params: { query, page } });

/** 搜索 TMDB 人物（演员 / 导演），返回 `data.results` */
export const searchTmdbPersonService = (query: string, page = 1) =>
  request.get<ApiResult<unknown>>(`${TMDB_PREFIX}/person/search`, { params: { query, page } });

/** 按人物筛选其参演（actor）或执导（director）的影片 */
export const getTmdbPersonMoviesService = (
  personId: number | string,
  role: 'actor' | 'director' = 'actor',
  page = 1,
) =>
  request.get<ApiResult<unknown>>(`${TMDB_PREFIX}/person/movies`, {
    params: { personId, role, page },
  });

/** 将 TMDB 影片导入本地影视库 */
export const importTmdbMovieService = (tmdbId: number | string) =>
  request.post<ApiResult<unknown>>(`${TMDB_PREFIX}/import`, null, { params: { tmdbId } });
