// 导入request.js请求工具
import request from '@/utils/request.js'

/**
 * 电影信息管理接口
 * 管理电影信息的增删改查功能
 */

// 分页查询电影列表
export const getMovieListService = (page = 1, size = 10) => {
  return request.get(`/v1/video/movie/list?page=${page}&size=${size}`)
}

// 根据ID查询电影详情
export const getMovieByIdService = (id) => {
  return request.get(`/v1/video/movie/${id}`)
}

// 新增电影
export const addMovieService = (movieData) => {
  return request.post('/v1/video/movie', movieData)
}

// 修改电影信息
export const updateMovieService = (movieData) => {
  return request.put('/v1/video/movie', movieData)
}

// 删除电影
export const deleteMovieService = (id) => {
  return request.delete(`/v1/video/movie/${id}`)
}

// 修改电影封面
export const updateCoverService = (movieId, imageFile) => {
  const formData = new FormData()
  formData.append('image', imageFile)
  return request.put(`/v1/video/movie/cover?movieId=${movieId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 修改电影视频
export const updateVideoService = (movieId, videoFile) => {
  const formData = new FormData()
  formData.append('video', videoFile)
  return request.put(`/v1/video/movie/video?movieId=${movieId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 根据关键字搜索电影
export const searchMovieService = (keyword, page = 1, size = 10) => {
  return request.get(`/v1/video/movie/search?keyword=${keyword}&page=${page}&size=${size}`)
}

// 根据导演模糊查找电影
export const searchMovieByDirectorService = (keyword, page = 1, size = 10) => {
  return request.get(`/v1/video/movie/search/director?keyword=${keyword}&page=${page}&size=${size}`)
}

// 根据演员模糊查找电影
export const searchMovieByActorService = (keyword, page = 1, size = 10) => {
  return request.get(`/v1/video/movie/search/actor?keyword=${keyword}&page=${page}&size=${size}`)
}

/**
 * 电影分类管理接口
 * 管理电影分类的增删改查功能
 */

// 查询所有分类
export const getAllCategoriesService = () => {
  return request.get('/v1/video/category/all')
}

// 分页查询分类列表
export const getCategoryListService = (page = 1, size = 10) => {
  return request.get(`/v1/video/category/list?page=${page}&size=${size}`)
}

// 根据ID查询分类详情
export const getCategoryByIdService = (id) => {
  return request.get(`/v1/video/category/${id}`)
}

// 新增分类
export const addCategoryService = (categoryData) => {
  return request.post('/v1/video/category', categoryData)
}

// 修改分类
export const updateCategoryService = (categoryData) => {
  return request.put('/v1/video/category', categoryData)
}

// 删除分类
export const deleteCategoryService = (id) => {
  return request.delete(`/v1/video/category/${id}`)
}

// 根据分类ID获取电影列表
export const getMoviesByCategoryIdService = (id, page = 1, size = 10) => {
  return request.get(`/v1/video/category/${id}/movies?page=${page}&size=${size}`)
}

/**
 * 电影标签管理接口
 * 管理电影标签的增删改查功能
 */

// 查询所有标签
export const getAllTagsService = () => {
  return request.get('/v1/video/tag/all')
}

// 分页查询标签列表
export const getTagListService = (page = 1, size = 10) => {
  return request.get(`/v1/video/tag/list?page=${page}&size=${size}`)
}

// 根据ID查询标签详情
export const getTagByIdService = (id) => {
  return request.get(`/v1/video/tag/${id}`)
}

// 新增标签
export const addTagService = (tagData) => {
  return request.post('/v1/video/tag', tagData)
}

// 修改标签
export const updateTagService = (tagData) => {
  return request.put('/v1/video/tag', tagData)
}

// 删除标签
export const deleteTagService = (id) => {
  return request.delete(`/v1/video/tag/${id}`)
}

// 根据标签ID获取电影列表
export const getMoviesByTagIdService = (id, page = 1, size = 10) => {
  return request.get(`/v1/video/tag/${id}/movies?page=${page}&size=${size}`)
}

/**
 * 电影评论管理接口
 * 管理电影评论的增删查功能
 */

// 根据电影ID获取评论列表
export const getCommentsByMovieIdService = (movieId, page = 1, size = 10) => {
  return request.get(`/v1/video/comment/movie/${movieId}?page=${page}&size=${size}`)
}

// 获取我的评论
export const getMyCommentsService = (page = 1, size = 10) => {
  return request.get(`/v1/video/comment/my?page=${page}&size=${size}`)
}

// 添加评论
export const addCommentService = (commentData) => {
  return request.post('/v1/video/comment', commentData)
}

// 删除评论
export const deleteCommentService = (id) => {
  return request.delete(`/v1/video/comment/${id}`)
}

/**
 * 电影收藏管理接口
 * 管理用户电影收藏的增删查功能
 */

// 获取收藏列表
export const getFavoriteListService = (page = 1, size = 10) => {
  return request.get(`/v1/video/favorite/list?page=${page}&size=${size}`)
}

// 添加收藏
export const addFavoriteService = (movieId) => {
  return request.post(`/v1/video/favorite/${movieId}`)
}

// 取消收藏
export const cancelFavoriteService = (movieId) => {
  return request.delete(`/v1/video/favorite/${movieId}`)
}

// 判断是否收藏
export const isFavoriteService = (movieId) => {
  return request.get(`/v1/video/favorite/check/${movieId}`)
}

/**
 * 点赞管理接口
 * 管理用户点赞的增删查功能
 */

// 点赞或取消点赞
export const toggleLikeService = (targetId, targetType) => {
  return request.post(`/v1/video/like/${targetId}/${targetType}`)
}

// 获取点赞数
export const getLikeCountService = (targetId, targetType) => {
  return request.get(`/v1/video/like/count/${targetId}/${targetType}`)
}

// 判断是否点赞
export const isLikedService = (targetId, targetType) => {
  return request.get(`/v1/video/like/check/${targetId}/${targetType}`)
}

/**
 * 视频观看记录接口
 * 管理用户视频观看记录
 */

// 更新观看记录
export const updateWatchRecordService = (movieId, watchTime, watchProgress) => {
  return request.post(`/v1/video/history/record?movieId=${movieId}&watchTime=${watchTime}&watchProgress=${watchProgress}`)
}

// 获取观看记录
export const getWatchRecordService = (movieId) => {
  return request.get(`/v1/video/history/record/${movieId}`)
}

// 获取观看历史
export const getWatchHistoryService = (page = 1, size = 10) => {
  return request.get(`/v1/video/history/list?page=${page}&size=${size}`)
}

// 删除观看记录
export const deleteWatchRecordService = (movieId) => {
  return request.delete(`/v1/video/history/${movieId}`)
}

// 清空观看历史
export const clearWatchHistoryService = () => {
  return request.delete('/v1/video/history/clear')
}

/**
 * 电影推荐接口
 * 管理用户电影推荐
 */

// 获取推荐电影
export const getRecommendationsService = (page = 1, size = 10) => {
  return request.get(`/v1/video/recommendation/list?page=${page}&size=${size}`)
}

// 获取未读推荐数量
export const getUnreadRecommendationsCountService = () => {
  return request.get('/v1/video/recommendation/unread/count')
}

// 标记推荐已读
export const markRecommendationAsReadService = (id) => {
  return request.put(`/v1/video/recommendation/read/${id}`)
}

// 重新生成推荐
export const refreshRecommendationsService = () => {
  return request.post('/v1/video/recommendation/refresh')
} 