import request, { type ApiResult } from '@/lib/request';

const prefix = '/v1/video/tmdb';

export const searchTmdbMoviesService = (query: string, page = 1) =>
  request.get(`${prefix}/search`, { params: { query, page } });

export const getTmdbPopularService = (page = 1) =>
  request.get(`${prefix}/popular`, { params: { page } });

export const getTmdbTopRatedService = (page = 1) =>
  request.get(`${prefix}/top-rated`, { params: { page } });

export const getTmdbDiscoverService = (params: Record<string, unknown> = {}) =>
  request.get(`${prefix}/discover`, { params });

export const getTmdbGenresService = () => request.get(`${prefix}/genres`);

export const getTmdbDetailService = (tmdbId: number | string) =>
  request.get(`${prefix}/${tmdbId}`);

export const importTmdbMovieService = (tmdbId: number | string) =>
  request.post<ApiResult<void>>(`${prefix}/import`, null, { params: { tmdbId } });

export const importTmdbBatchService = (tmdbIds: Array<number | string>) =>
  request.post<ApiResult<void>>(`${prefix}/import/batch`, tmdbIds);
