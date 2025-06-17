<script setup>
import { ref, onMounted, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { cancelAllRequests } from '@/utils/request.js'
import {
  getMovieListService,
  searchMovieService,
  searchMovieByDirectorService,
  searchMovieByActorService,
  getAllCategoriesService,
  getMoviesByCategoryIdService,
  isFavoriteService,
  addFavoriteService,
  cancelFavoriteService,
  getLikeCountService,
  isLikedService,
  toggleLikeService,
  getRecommendationsService
} from '@/api/video.js'

// 导入Element Plus图标
import {
  Document,
  VideoCamera,
  Headset,
  VideoPlay,
  Search,
  Star,
  StarFilled
} from '@element-plus/icons-vue'

const router = useRouter()

// 查询参数
const queryParams = reactive({
  page: 1,
  size: 10,
  keyword: '',
  categoryId: null,
  searchType: 'title' // 'title', 'director', 'actor'
})

// 视频数据
const videos = ref([])
const total = ref(0)
const loading = ref(false)

// 分类数据
const categories = ref([])
const loadingCategories = ref(false)

// 排序方式
const sortOrder = ref('rating')

// 获取视频列表
const fetchVideos = async () => {
  try {
    loading.value = true
    let response
    
    if (queryParams.categoryId) {
      // 按分类获取
      response = await getMoviesByCategoryIdService(
        queryParams.categoryId,
        queryParams.page,
        queryParams.size
      )
    } else if (queryParams.keyword) {
      // 按关键词搜索
      switch (queryParams.searchType) {
        case 'director':
          response = await searchMovieByDirectorService(
            queryParams.keyword,
            queryParams.page,
            queryParams.size
          )
          break
        case 'actor':
          response = await searchMovieByActorService(
            queryParams.keyword,
            queryParams.page,
            queryParams.size
          )
          break
        default:
          response = await searchMovieService(
            queryParams.keyword,
            queryParams.page,
            queryParams.size
          )
      }
    } else {
      // 获取所有或推荐
      if (showRecommendations.value) {
        response = await getRecommendationsService(queryParams.page, queryParams.size)
      } else {
        response = await getMovieListService(queryParams.page, queryParams.size)
      }
    }
    
    if (response.code === 200) {
      videos.value = response.data.records || []
      total.value = response.data.total || 0
      sortVideos()
    } else {
      ElMessage.error(response.message || '获取视频列表失败')
    }
  } catch (error) {
    console.error('获取视频列表出错:', error)
    ElMessage.error('获取视频列表失败')
  } finally {
    loading.value = false
  }
}

// 获取分类列表
const fetchCategories = async () => {
  try {
    loadingCategories.value = true
    const response = await getAllCategoriesService()
    
    if (response.code === 200) {
      categories.value = response.data || []
    } else {
      ElMessage.error(response.message || '获取分类列表失败')
    }
  } catch (error) {
    console.error('获取分类列表出错:', error)
    ElMessage.error('获取分类列表失败')
  } finally {
    loadingCategories.value = false
  }
}

// 排序视频
const sortVideos = () => {
  switch (sortOrder.value) {
    case 'rating':
      videos.value.sort((a, b) => b.rate - a.rate)
      break
    case 'year':
      videos.value.sort((a, b) => {
        const dateA = a.showTime ? new Date(a.showTime) : null
        const dateB = b.showTime ? new Date(b.showTime) : null
        if (!dateA) return 1
        if (!dateB) return -1
        return dateB - dateA
      })
      break
    case 'title':
      videos.value.sort((a, b) => a.name.localeCompare(b.name))
      break
  }
}

// 监听排序变化
watch(sortOrder, () => {
  sortVideos()
})

// 监听查询参数变化
watch(
  [() => queryParams.keyword, () => queryParams.categoryId, () => queryParams.searchType],
  () => {
    queryParams.page = 1
    fetchVideos()
  }
)

// 显示推荐
const showRecommendations = ref(false)

// 搜索处理
const handleSearch = () => {
  queryParams.page = 1
  fetchVideos()
}

// 分类点击处理
const handleCategoryClick = (id) => {
  queryParams.categoryId = id
  queryParams.keyword = ''
  showRecommendations.value = false
}

// 查看推荐
const handleViewRecommendations = () => {
  queryParams.categoryId = null
  queryParams.keyword = ''
  showRecommendations.value = true
  fetchVideos()
}

// 重置筛选
const resetFilter = () => {
  queryParams.categoryId = null
  queryParams.keyword = ''
  queryParams.searchType = 'title'
  queryParams.page = 1
  sortOrder.value = 'rating'
  showRecommendations.value = false
  fetchVideos()
}

// 点击视频
const handleVideoClick = (video) => {
  router.push(`/content/movie/play/${video.id}`)
}

// 播放视频
const playVideo = (video, event) => {
  event.stopPropagation()
  router.push(`/content/movie/play/${video.id}`)
}

// 收藏视频
const handleFavorite = async (video, event) => {
  event.stopPropagation()
  try {
    const isFav = await isFavoriteService(video.id)
    if (isFav.code === 200 && isFav.data) {
      // 已收藏，取消收藏
      const res = await cancelFavoriteService(video.id)
      if (res.code === 200) {
        ElMessage.success(`已取消收藏《${video.name}》`)
        video.isFavorite = false
      } else {
        ElMessage.error(res.message || '取消收藏失败')
      }
    } else {
      // 未收藏，添加收藏
      const res = await addFavoriteService(video.id)
      if (res.code === 200) {
        ElMessage.success(`已收藏《${video.name}》`)
        video.isFavorite = true
      } else {
        ElMessage.error(res.message || '收藏失败')
      }
    }
  } catch (error) {
    console.error('处理收藏出错:', error)
    ElMessage.error('操作失败')
  }
}

// 获取电影时长格式化
const formatDuration = (minutes) => {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`
}

// 分页处理
const handleCurrentChange = (page) => {
  queryParams.page = page
  fetchVideos()
}

onMounted(() => {
  fetchCategories()
  fetchVideos()
})

// 组件卸载前取消所有挂起的请求
onBeforeUnmount(() => {
  cancelAllRequests()
})
</script>

<template>
  <div class="video-view">
    <div class="page-header">
      <h2>视频浏览</h2>
    </div>
    
    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <div class="filter-container">
        <div class="search-group">
          <el-select v-model="queryParams.searchType" class="search-type-select">
            <el-option label="标题" value="title" />
            <el-option label="导演" value="director" />
            <el-option label="演员" value="actor" />
          </el-select>
          <el-input
            v-model="queryParams.keyword"
            :placeholder="`搜索电影${queryParams.searchType === 'title' ? '标题' : queryParams.searchType === 'director' ? '导演' : '演员'}`"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append>
              <el-button @click="handleSearch">搜索</el-button>
            </template>
          </el-input>
        </div>
        
        <div class="action-group">
          <el-select
            v-model="sortOrder"
            placeholder="排序方式"
            class="sort-select"
          >
            <el-option label="评分排序" value="rating" />
            <el-option label="上映年份" value="year" />
            <el-option label="标题排序" value="title" />
          </el-select>
          
          <el-button @click="resetFilter" type="info" plain>重置</el-button>
          <el-button @click="handleViewRecommendations" type="primary" :class="{ active: showRecommendations }">为我推荐</el-button>
        </div>
      </div>
      
      <!-- 分类标签 -->
      <div class="category-tags" v-loading="loadingCategories">
        <el-tag
          :class="{ active: !queryParams.categoryId && !showRecommendations }"
          @click="handleCategoryClick(null)"
          effect="plain"
        >
          全部
        </el-tag>
        <el-tag
          v-for="category in categories"
          :key="category.id"
          :class="{ active: queryParams.categoryId === category.id }"
          @click="handleCategoryClick(category.id)"
          effect="plain"
        >
          {{ category.name }}
        </el-tag>
      </div>
    </el-card>
    
    <!-- 视频列表 -->
    <div class="videos-container" v-loading="loading">
      <el-empty v-if="!loading && videos.length === 0" description="没有找到符合条件的视频" />
      
      <div v-else class="videos-grid">
        <el-card 
          v-for="video in videos" 
          :key="video.id" 
          class="video-card"
          @click="handleVideoClick(video)"
          shadow="hover"
        >
          <div class="video-cover">
            <el-image :src="video.picture" fit="cover" :alt="video.name">
              <template #error>
                <div class="image-placeholder">
                  <el-icon><VideoCamera /></el-icon>
                </div>
              </template>
            </el-image>
            <div class="video-actions">
              <el-button 
                circle
                class="action-btn play-btn" 
                @click.stop="playVideo(video, $event)"
                title="播放"
              >
                <el-icon><VideoPlay /></el-icon>
              </el-button>
              <el-button 
                circle
                class="action-btn favorite-btn" 
                @click.stop="handleFavorite(video, $event)"
                :title="video.isFavorite ? '取消收藏' : '收藏'"
              >
                <el-icon>
                  <StarFilled v-if="video.isFavorite" />
                  <Star v-else />
                </el-icon>
              </el-button>
            </div>
            <div class="video-duration">{{ formatDuration(video.time) }}</div>
            <div class="video-rating">
              <el-rate
                v-model="video.rate"
                disabled
                text-color="#ff9900"
                score-template="{value}"
                show-score
              />
            </div>
          </div>
          <div class="video-info">
            <h3 class="video-title">{{ video.name }}</h3>
            <div class="video-director">导演: {{ video.directedBy }}</div>
            <div class="video-meta">
              <el-tag size="small" class="video-category">{{ video.type }}</el-tag>
              <span class="video-year" v-if="video.showTime">{{ new Date(video.showTime).getFullYear() }}年</span>
            </div>
            <div class="video-description">{{ video.abs }}</div>
          </div>
        </el-card>
      </div>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:currentPage="queryParams.page"
          :page-size="queryParams.size"
          layout="prev, pager, next, jumper"
          :total="total"
          @current-change="handleCurrentChange"
          background
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$primary-color: #6d28d9;
$secondary-color: #7c3aed;
$light-color: #ddd6fe;
$background-color: #f5f3ff;
$card-color: #ffffff;
$text-color: #1e293b;
$border-color: #c4b5fd;
$accent-color: #8b5cf6;

.video-view {
  padding: 20px;
  background-color: $background-color;
  min-height: calc(100vh - 120px);
}

.page-header {
  margin-bottom: 24px;
  position: relative;
  border-left: 4px solid $primary-color;
  padding-left: 16px;
  
  h2 {
    font-size: 28px;
    font-weight: 600;
    margin: 0;
    background: linear-gradient(45deg, $primary-color, $secondary-color);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
    display: inline-block;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, $primary-color, $secondary-color);
      border-radius: 3px;
    }
  }
}

.filter-card {
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  background-color: $card-color;
  border: none;
  
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.filter-container {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  
  .search-group {
    display: flex;
    flex: 1;
    min-width: 300px;
    
    .search-type-select {
      width: 120px;
      margin-right: -1px;
      
      :deep(.el-input__wrapper) {
        border-radius: 8px 0 0 8px;
      }
    }
    
    .search-input {
      flex: 1;
      
      :deep(.el-input__wrapper) {
        border-radius: 0 8px 8px 0;
        box-shadow: 0 0 0 1px rgba($primary-color, 0.1);
        
        &:hover, &:focus {
          box-shadow: 0 0 0 1px rgba($primary-color, 0.3);
        }
      }
      
      :deep(.el-input__prefix) {
        color: $primary-color;
      }
      
      :deep(.el-input-group__append) {
        padding: 0;
        
        .el-button {
          border-radius: 0 8px 8px 0;
          margin: 0;
          height: 100%;
          padding: 0 20px;
          border: none;
          background-color: $primary-color;
          color: white;
          
          &:hover {
            background-color: $secondary-color;
          }
        }
      }
    }
  }
  
  .action-group {
    display: flex;
    gap: 10px;
    
    .sort-select {
      width: 120px;
      
      :deep(.el-input__wrapper) {
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba($primary-color, 0.1);
        
        &:hover, &:focus {
          box-shadow: 0 0 0 1px rgba($primary-color, 0.3);
        }
      }
    }
    
    .el-button {
      border-radius: 8px;
      
      &.active {
        background-color: $accent-color;
        border-color: $accent-color;
        color: white;
      }
      
      &:hover {
        border-color: $primary-color;
        color: $primary-color;
        
        &.active {
          color: white;
        }
      }
    }
  }
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  
  .el-tag {
    cursor: pointer;
    transition: all 0.3s;
    font-size: 14px;
    padding: 0 12px;
    height: 32px;
    line-height: 30px;
    
    &:hover {
      color: $primary-color;
      border-color: $primary-color;
    }
    
    &.active {
      background-color: $primary-color;
      border-color: $primary-color;
      color: white;
    }
  }
}

.videos-container {
  margin-top: 20px;
  min-height: 400px;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.video-card {
  cursor: pointer;
  transition: transform 0.3s;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    
    .video-actions {
      opacity: 1;
    }
  }
  
  :deep(.el-card__body) {
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

.video-cover {
  position: relative;
  
  .el-image {
    width: 100%;
    height: 180px;
    display: block;
  }
  
  .image-placeholder {
    width: 100%;
    height: 180px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f5f7fa;
    color: #909399;
    font-size: 30px;
  }
  
  .video-actions {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s;
    
    .action-btn {
      background-color: rgba(255, 255, 255, 0.9);
      color: $primary-color;
      font-size: 20px;
      border: none;
      
      &:hover {
        background-color: white;
        color: $secondary-color;
        transform: scale(1.1);
      }
      
      &.play-btn {
        font-size: 24px;
      }
    }
  }
  
  .video-duration {
    position: absolute;
    bottom: 40px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  }
  
  .video-rating {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 5px;
    text-align: center;
  }
}

.video-info {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  
  .video-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 5px;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .video-director {
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .video-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    
    .video-year {
      font-size: 12px;
      color: #909399;
    }
  }
  
  .video-description {
    font-size: 14px;
    color: #666;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
  }
}

.pagination-container {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}
</style> 