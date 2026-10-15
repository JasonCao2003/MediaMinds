import request, { type ApiResult } from '@/lib/request';

// =============== 内容统计（首页概览用）===============

/** 获取歌曲总数 */
export const getSongCountService = () =>
  request.get<ApiResult<number>>('/v1/music/songs/count');

/** 获取电影总数 */
export const getMovieCountService = () =>
  request.get<ApiResult<number>>('/v1/video/movie/count');

/** 获取书籍总数 */
export const getBookCountService = () =>
  request.get<ApiResult<number>>('/v1/book/product/count');

/** 首页内容概览：并行拉取三类资源总数 */
export const getContentCategoryService = async () => {
  const [songs, movies, books] = await Promise.all([
    getSongCountService(),
    getMovieCountService(),
    getBookCountService(),
  ]);
  return { songs: songs.data, movies: movies.data, books: books.data };
};
