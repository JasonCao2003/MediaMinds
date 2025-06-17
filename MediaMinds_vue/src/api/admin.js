// 导入request.js请求工具
import request from '@/utils/request.js'

// 获取歌曲总数
export const getSongCountService = () => {
  return request.get('/v1/music/songs/count')
}

// 获取电影总数
export const getMovieCountService = () => {
  return request.get('/v1/video/movie/count')
}

// 获取书籍总数
export const getBookCountService = () => {
  return request.get('/v1/book/product/count')
}

// 获取用户总数
export const getTotalUserCountService = () => {
  return request.get('/v1/auth/user/count/total')
}

// 获取活跃用户数
export const getActiveUserCountService = () => {
  return request.get('/v1/auth/user/count/active')
}

// 获取用户增长趋势数据
export const getUserGrowthService = () => {
  // 由于没有专门的用户增长趋势API，我们可以利用用户列表API来模拟
  // 获取所有用户并按注册时间分组统计
  return request.get('/v1/auth/user/list', {
    params: {
      currentPage: 1,
      pageSize: 1000 // 获取足够多的用户以进行统计
    }
  })
}

// 获取内容分类统计数据
export const getContentCategoryService = async () => {
  try {
    const [songs, movies, books] = await Promise.all([
      getSongCountService(),
      getMovieCountService(),
      getBookCountService()
    ])
    
    return {
      songs: songs.data,
      movies: movies.data,
      books: books.data
    }
  } catch (error) {
    console.error('获取内容分类统计数据失败', error)
    throw error
  }
}

// 获取仪表盘所有统计数据
export const getDashboardStatsService = async () => {
  try {
    const [totalUsers, activeUsers, songs, movies, books] = await Promise.all([
      getTotalUserCountService(),
      getActiveUserCountService(),
      getSongCountService(),
      getMovieCountService(),
      getBookCountService()
    ])
    
    return {
      totalUsers: totalUsers.data,
      activeUsers: activeUsers.data,
      totalContent: songs.data + movies.data + books.data,
      contentDetails: {
        songs: songs.data,
        movies: movies.data,
        books: books.data
      }
    }
  } catch (error) {
    console.error('获取仪表盘统计数据失败', error)
    throw error
  }
} 