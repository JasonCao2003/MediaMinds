// 导入request.js请求工具
import request from '@/utils/request.js'

// ================== 歌曲管理 ==================

// 查询所有歌曲
export const getAllSongsService = (params = {}) => {
  // 转换分页参数
  const apiParams = { ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/songs', { params: apiParams })
}

// 根据ID查询歌曲
export const getSongByIdService = (id) => {
  return request.get(`/v1/music/songs/${id}`)
}

// 根据歌曲名称查询歌曲
export const getSongByNameService = (name, params = {}) => {
  // 转换分页参数
  const apiParams = { name, ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/songs/bySongName', { params: apiParams })
}

// 根据歌手名称查询歌曲
export const getSongsBySingerNameService = (name, params = {}) => {
  // 转换分页参数
  const apiParams = { name, ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/songs/bySingerName', { params: apiParams })
}

// 根据歌手ID查询歌曲
export const getSongsBySingerIdService = (singerId, params = {}) => {
  // 转换分页参数
  const apiParams = { ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get(`/v1/music/songs/bySinger/${singerId}`, { params: apiParams })
}

// 新增歌曲
export const addSongService = (songData, file) => {
  const formData = new FormData()
  formData.append('song', JSON.stringify(songData))
  formData.append('file', file)
  
  return request.post('/v1/music/songs', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 更新歌曲信息
export const updateSongService = (id, songData) => {
  return request.put(`/v1/music/songs/${id}`, songData)
}

// 删除歌曲
export const deleteSongService = (id) => {
  return request.delete(`/v1/music/songs/${id}`)
}

// 上传歌曲文件
export const uploadSongFileService = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  return request.post(`/v1/music/songs/${id}/file`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 上传歌曲封面
export const uploadSongCoverService = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  return request.post(`/v1/music/songs/${id}/cover`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// ================== 歌手管理 ==================

// 查询所有歌手
export const getAllSingersService = (params = {}) => {
  // 转换分页参数
  const apiParams = { ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/singer', { params: apiParams })
}

// 根据性别查询歌手
export const getSingersBySexService = (sex, params = {}) => {
  // 转换分页参数
  const apiParams = { sex, ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/singer/bySex', { params: apiParams })
}

// 根据姓名查询歌手
export const getSingersByNameService = (name, params = {}) => {
  // 转换分页参数
  const apiParams = { name, ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/singer/byName', { params: apiParams })
}

// 添加歌手
export const addSingerService = (singerData) => {
  return request.post('/v1/music/singer', singerData)
}

// 更新歌手信息
export const updateSingerService = (singerData) => {
  return request.put('/v1/music/singer', singerData)
}

// 删除歌手
export const deleteSingerService = (id) => {
  return request.delete(`/v1/music/singer/${id}`)
}

// 上传歌手头像
export const uploadSingerAvatarService = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  return request.post(`/v1/music/singer/${id}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// ================== 歌单管理 ==================

// 查询所有歌单
export const getAllSongListsService = (params = {}) => {
  // 转换分页参数
  const apiParams = { ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/song-list', { params: apiParams })
}


// 根据标题模糊查询歌单
export const getSongListByLikeTitleService = (title, params = {}) => {
  // 转换分页参数
  const apiParams = { title, ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/song-list/like-title', { params: apiParams })
}

// 根据歌单风格查询
export const getSongListByStyleService = (style, params = {}) => {
  // 转换分页参数
  const apiParams = { style, ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/song-list/style', { params: apiParams })
}

// 获取推荐歌单
export const getRecommendedSongListsService = () => {
  return request.get('/v1/music/song-list/recommend')
}

// 获取个性化推荐歌曲
export const getRecommendedSongsService = () => {
  return request.get('/v1/music/songs/recommend')
}



// 添加歌单
export const addSongListService = (songListData) => {
  return request.post('/v1/music/song-list', songListData)
}

// 更新歌单信息
export const updateSongListService = (id, songListData) => {
  return request.put(`/v1/music/song-list/${id}`, songListData)
}

// 删除歌单
export const deleteSongListService = (id) => {
  return request.delete(`/v1/music/song-list/${id}`)
}

// 更新歌单封面
export const updateSongListCoverService = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  return request.post(`/v1/music/song-list/${id}/img`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// ================== 歌单歌曲管理 ==================

// 获取所有歌单歌曲
export const getAllListSongService = (params = {}) => {
  // 转换分页参数
  const apiParams = { ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/listSong/page', { params: apiParams })
}

// 根据歌单ID获取歌曲列表
export const getListSongBySongListIdService = (songListId, params = {}) => {
  // 转换分页参数
  const apiParams = { songListId, ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/listSong/bySongListId', { params: apiParams })
}

// 添加歌曲到歌单
export const addListSongService = (listSongData) => {
  return request.post('/v1/music/listSong', listSongData)
}

// 更新歌单歌曲信息
export const updateListSongService = (listSongData) => {
  return request.put('/v1/music/listSong', listSongData)
}

// 删除歌单中的歌曲
export const deleteListSongService = (id) => {
  return request.delete(`/v1/music/listSong/${id}`)
}

// ================== 评论管理 ==================

// 查询评论
export const getCommentsService = (params = {}) => {
  // 转换分页参数
  const apiParams = { ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/comments/page', { params: apiParams })
}

// 查询单条评论
export const getCommentByIdService = (id) => {
  return request.get(`/v1/music/comments/${id}`)
}

// 新增评论
export const addCommentService = (commentData) => {
  return request.post('/v1/music/comments', commentData)
}

// 修改评论
export const updateCommentService = (id, commentData) => {
  return request.put(`/v1/music/comments/${id}`, commentData)
}

// 删除评论
export const deleteCommentService = (id) => {
  return request.delete(`/v1/music/comments/${id}`)
}

// 点赞评论
export const likeCommentService = (id) => {
  return request.patch(`/v1/music/comments/${id}/like`)
}

// ================== 收藏管理 ==================

// 查询当前用户收藏
export const getUserCollectionsService = (params = {}) => {
  // 转换分页参数
  const apiParams = { ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/collections', { params: apiParams })
}

// 查询全部收藏记录 (管理员)
export const getAllCollectionsService = (params = {}) => {
  // 转换分页参数
  const apiParams = { ...params }
  if (params.page !== undefined) {
    apiParams.pageNum = params.page
    delete apiParams.page
  }
  if (params.size !== undefined) {
    apiParams.pageSize = params.size
    delete apiParams.size
  }
  return request.get('/v1/music/collections/all', { params: apiParams })
}

// 添加收藏
export const addCollectionService = (type, songId, songListId) => {
  const params = { type }
  if (type === '0' && songId) params.songId = songId
  if (type === '1' && songListId) params.songListId = songListId
  
  return request.post('/v1/music/collections', null, { params })
}

// 更新收藏信息
export const updateCollectionService = (id, type, songId) => {
  return request.put(`/v1/music/collections/${id}`, null, {
    params: { type, songId }
  })
}

// 删除收藏
export const deleteCollectionService = (songId) => {
  return request.delete(`/v1/music/collections/${songId}`)
}

// ================== 歌单评分管理 ==================

// 获取歌单评分
export const getRankBySongListIdService = (songListId) => {
  return request.get(`/v1/music/rank/${songListId}`)
}

// 提交评分
export const addRankService = (rankData) => {
  return request.post('/v1/music/rank', rankData)
}

// ================== AI分析功能 ==================

// 歌词情感分析
export const getLyricsAnalysisService = (content, userId) => {
  return request.post('/v1/spark/lyrics/analysis', {
    content,
    userId
  })
} 