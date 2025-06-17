// 导入request.js请求工具
import request from '@/utils/request.js'

/**
 * 书籍信息管理接口
 * 管理书籍信息的增删改查功能
 */

// 分页查询书籍列表
export const getBookListService = (page = 1, size = 10) => {
  return request.get(`/v1/book/product/list?page=${page}&size=${size}`)
}

// 根据ID查询书籍详情
export const getBookByIdService = (id) => {
  return request.get(`/v1/book/product/${id}`)
}

// 新增书籍
export const addBookService = (bookData) => {
  return request.post('/v1/book/product', bookData)
}

// 修改书籍信息
export const updateBookService = (bookData) => {
  return request.put('/v1/book/product', bookData)
}

// 删除书籍
export const deleteBookService = (id) => {
  return request.delete(`/v1/book/product/${id}`)
}

// 修改书籍封面
export const updateCoverService = (bookId, file) => {
  // 创建FormData对象用于文件上传
  const formData = new FormData()
  formData.append('bookId', bookId)
  formData.append('image', file)
  
  return request.put('/v1/book/product/cover', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 根据关键字搜索书籍
export const searchBookService = (keyword, page = 1, size = 10) => {
  return request.get(`/v1/book/product/search?keyword=${keyword}&page=${page}&size=${size}`)
}

// 根据作者模糊查找书籍
export const searchBookByAuthorService = (keyword, page = 1, size = 10) => {
  return request.get(`/v1/book/product/search/author?keyword=${keyword}&page=${page}&size=${size}`)
}

/**
 * 书籍类型管理接口
 * 管理书籍类型的增删改查及推荐功能
 */

// 查询所有书籍类型
export const getAllTypesService = () => {
  return request.get('/v1/book/type/all')
}

// 分页查询书籍类型列表
export const getTypeListService = (page = 1, size = 10) => {
  return request.get(`/v1/book/type/list?page=${page}&size=${size}`)
}

// 根据ID查询书籍类型详情
export const getTypeByIdService = (id) => {
  return request.get(`/v1/book/type/${id}`)
}

// 新增书籍类型
export const addTypeService = (typeData) => {
  return request.post('/v1/book/type', typeData)
}

// 修改书籍类型
export const updateTypeService = (typeData) => {
  return request.put('/v1/book/type', typeData)
}

// 删除书籍类型
export const deleteTypeService = (id) => {
  return request.delete(`/v1/book/type/${id}`)
}

// 推荐书籍（基于物品的协同过滤算法）
export const getRecommendBooksService = () => {
  return request.get('/v1/book/type/recommend')
}

/**
 * 书籍章节管理接口
 * 管理书籍章节的增删改查功能
 */

// 分页查询章节列表
export const getChapterListService = (bookId, page = 1, size = 10) => {
  return request.get(`/v1/book/chapter/page?bookId=${bookId}&page=${page}&size=${size}`)
}

// 获取所有章节列表（不分页）
export const getAllChaptersService = (bookId) => {
  return request.get(`/v1/book/chapter/list?bookId=${bookId}`)
}

// 根据ID查询章节详情
export const getChapterByIdService = (id) => {
  return request.get(`/v1/book/chapter/${id}`)
}

// 获取章节内容（解决CORS问题）
export const getChapterContentService = (id) => {
  return request.get(`/v1/book/chapter/content/${id}`)
}

// 新增章节
export const addChapterService = (chapterData) => {
  return request.post('/v1/book/chapter', chapterData)
}

// 修改章节
export const updateChapterService = (chapterData) => {
  return request.put('/v1/book/chapter', chapterData)
}

// 删除章节
export const deleteChapterService = (id) => {
  return request.delete(`/v1/book/chapter/${id}`)
}

/**
 * 书籍收藏管理接口
 * 管理用户书籍收藏的增删查功能
 */

// 分页查询用户收藏列表
export const getFavoriteListService = (page = 1, size = 10) => {
  return request.get(`/v1/book/favorite/list?page=${page}&size=${size}`)
}

// 根据ID查询收藏详情
export const getFavoriteByIdService = (id) => {
  return request.get(`/v1/book/favorite/${id}`)
}

// 新增收藏
export const addFavoriteService = (favoriteData) => {
  return request.post('/v1/book/favorite', favoriteData)
}

// 删除收藏
export const deleteFavoriteService = (id) => {
  return request.delete(`/v1/book/favorite/${id}`)
}

// 删除书籍收藏
export const deleteFavoriteByBookService = (bookId, chapterId = null) => {
  if (chapterId) {
    // 删除特定章节的收藏
    return request.delete(`/v1/book/favorite/book/${bookId}/chapter/${chapterId}`)
  } else {
    // 删除整本书的收藏
    return request.delete(`/v1/book/favorite/book/${bookId}`)
  }
}

// 分页查询收藏章节列表
export const getFavoriteChaptersService = (bookId, page = 1, size = 10) => {
  return request.get(`/v1/book/favorite/chapters/${bookId}?page=${page}&size=${size}`)
}

// 获取小说文章概要
export const getNovelSummaryService = (content, userId) => {
  return request.post('/v1/spark/novel/summary', {
    content,
    userId
  })
}
