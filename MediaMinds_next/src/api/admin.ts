import request, { type ApiResult } from '@/lib/request';

/** 获取歌曲总数 */
export const getSongCountService = () =>
  request.get<ApiResult<number>>('/v1/music/songs/count');

/** 获取电影总数 */
export const getMovieCountService = () =>
  request.get<ApiResult<number>>('/v1/video/movie/count');

/** 获取书籍总数 */
export const getBookCountService = () =>
  request.get<ApiResult<number>>('/v1/book/product/count');

/** 获取用户总数 */
export const getTotalUserCountService = () =>
  request.get<ApiResult<number>>('/v1/auth/user/count/total');

/** 获取活跃用户数 */
export const getActiveUserCountService = () =>
  request.get<ApiResult<number>>('/v1/auth/user/count/active');

/** 获取用户列表（用于统计） */
export const getUserGrowthService = () =>
  request.get('/v1/auth/user/list', {
    params: { currentPage: 1, pageSize: 1000 },
  });

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  contentDetails: { songs: number; movies: number; books: number };
}

/** 聚合仪表盘统计数据 */
export const getDashboardStatsService = async (): Promise<DashboardStats> => {
  const [totalUsers, activeUsers, songs, movies, books] = await Promise.all([
    getTotalUserCountService(),
    getActiveUserCountService(),
    getSongCountService(),
    getMovieCountService(),
    getBookCountService(),
  ]);
  const s = songs.data ?? 0;
  const m = movies.data ?? 0;
  const b = books.data ?? 0;
  return {
    totalUsers: totalUsers.data ?? 0,
    activeUsers: activeUsers.data ?? 0,
    totalContent: s + m + b,
    contentDetails: { songs: s, movies: m, books: b },
  };
};

export const getContentCategoryService = async () => {
  const [songs, movies, books] = await Promise.all([
    getSongCountService(),
    getMovieCountService(),
    getBookCountService(),
  ]);
  return { songs: songs.data, movies: movies.data, books: books.data };
};
