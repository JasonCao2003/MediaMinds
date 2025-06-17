<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElLoading } from 'element-plus'
import { getMovieByIdService, updateWatchRecordService } from '@/api/video.js'
import { cancelAllRequests } from '@/utils/request.js'

// 导入Element Plus图标
import {
  ArrowLeft,
  FullScreen,
  VideoPlay,
  VideoPause,
  Star,
  StarFilled,
  ChatDotRound
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const movieId = route.params.id

// 视频数据
const movie = ref({})
const loading = ref(false)
const videoRef = ref(null)
const isPlaying = ref(false)
const isFullscreen = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)
const volume = ref(100)
const isMuted = ref(false)

// 获取视频详情
const fetchMovieDetail = async () => {
  loading.value = true
  try {
    const res = await getMovieByIdService(movieId)
    if (res.code === 200) {
      movie.value = res.data
      // 如果有观看记录，设置进度
      if (res.data.watchProgress) {
        currentTime.value = res.data.watchProgress
      }
    } else {
      ElMessage.error(res.message || '获取视频详情失败')
    }
  } catch (error) {
    console.error('获取视频详情出错:', error)
    ElMessage.error('获取视频详情失败')
  } finally {
    loading.value = false
  }
}

// 播放控制
const togglePlay = () => {
  const video = videoRef.value
  if (!video) return
  
  if (video.paused) {
    video.play()
    isPlaying.value = true
  } else {
    video.pause()
    isPlaying.value = false
  }
}

// 全屏控制
const toggleFullscreen = () => {
  const videoContainer = document.querySelector('.video-container')
  if (!videoContainer) return
  
  if (!isFullscreen.value) {
    if (videoContainer.requestFullscreen) {
      videoContainer.requestFullscreen()
    } else if (videoContainer.webkitRequestFullscreen) {
      videoContainer.webkitRequestFullscreen()
    } else if (videoContainer.msRequestFullscreen) {
      videoContainer.msRequestFullscreen()
    }
    isFullscreen.value = true
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen()
    }
    isFullscreen.value = false
  }
}

// 监听全屏变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

// 更新进度条
const updateProgress = () => {
  const video = videoRef.value
  if (!video) return
  
  currentTime.value = video.currentTime
  duration.value = video.duration
  progress.value = (video.currentTime / video.duration) * 100
}

// 设置进度
const setProgress = (e) => {
  const progressBar = e.target
  const clickPosition = e.offsetX / progressBar.offsetWidth
  const video = videoRef.value
  if (!video) return
  
  video.currentTime = clickPosition * video.duration
  updateProgress()
}

// 设置音量
const setVolume = (val) => {
  volume.value = val
  const video = videoRef.value
  if (!video) return
  
  video.volume = val / 100
  isMuted.value = val === 0
}

// 静音控制
const toggleMute = () => {
  const video = videoRef.value
  if (!video) return
  
  if (isMuted.value) {
    video.volume = volume.value / 100
    isMuted.value = false
  } else {
    video.volume = 0
    isMuted.value = true
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 格式化时间
const formatTime = (seconds) => {
  if (!seconds) return '00:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 格式化电影时长
const formatDuration = (minutes) => {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`
}

// 更新观看记录
const updateWatchRecord = async () => {
  if (!videoRef.value) return
  
  try {
    const watchTime = Math.floor(Date.now() / 1000) // 当前时间戳（秒）
    const watchProgress = Math.floor(videoRef.value.currentTime) // 当前播放进度（秒）
    
    await updateWatchRecordService(movieId, watchTime, watchProgress)
  } catch (error) {
    console.error('更新观看记录失败:', error)
  }
}

// 定期更新观看记录
let recordUpdateInterval = null

// 监听视频事件
onMounted(() => {
  fetchMovieDetail()
  
  // 监听全屏变化
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('mozfullscreenchange', handleFullscreenChange)
  document.addEventListener('MSFullscreenChange', handleFullscreenChange)
  
  // 设置定时更新观看记录
  recordUpdateInterval = setInterval(updateWatchRecord, 30000) // 每30秒更新一次
})

onBeforeUnmount(() => {
  // 清除事件监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
  
  // 清除定时器
  if (recordUpdateInterval) {
    clearInterval(recordUpdateInterval)
  }
  
  // 离开页面前更新一次观看记录
  updateWatchRecord()
  
  // 取消所有挂起的请求
  cancelAllRequests()
})
</script>

<template>
  <div class="movie-player-page">
    <!-- 返回按钮 -->
    <div class="back-button">
      <el-button @click="goBack" icon="ArrowLeft" round>返回</el-button>
    </div>
    
    <div class="player-container" v-loading="loading">
      <!-- 视频播放器 -->
      <div class="video-container">
        <video
          ref="videoRef"
          :src="movie.video"
          class="video-player"
          @timeupdate="updateProgress"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @ended="isPlaying = false"
          @click="togglePlay"
          controls
        ></video>
        
        <!-- 自定义控制器 -->
        <div class="custom-controls" v-if="false">
          <!-- 进度条 -->
          <div class="progress-container" @click="setProgress">
            <div class="progress-bar">
              <div class="progress-filled" :style="{ width: `${progress}%` }"></div>
            </div>
            <div class="time-display">
              <span>{{ formatTime(currentTime) }}</span>
              <span>/</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
          </div>
          
          <!-- 控制按钮 -->
          <div class="controls-buttons">
            <button @click="togglePlay" class="control-button">
              <el-icon :size="24">
                <component :is="isPlaying ? VideoPause : VideoPlay" />
              </el-icon>
            </button>
            
            <!-- 音量控制 -->
            <div class="volume-control">
              <button @click="toggleMute" class="control-button">
                <i :class="isMuted ? 'el-icon-turn-off-microphone' : 'el-icon-microphone'"></i>
              </button>
              <el-slider
                v-model="volume"
                @input="setVolume"
                :min="0"
                :max="100"
                class="volume-slider"
              ></el-slider>
            </div>
            
            <!-- 全屏按钮 -->
            <button @click="toggleFullscreen" class="control-button">
              <el-icon :size="20"><FullScreen /></el-icon>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 视频信息 -->
      <div class="movie-info">
        <h1 class="movie-title">{{ movie.name }}</h1>
        
        <div class="movie-meta">
          <div class="meta-item">
            <span class="meta-label">导演：</span>
            <span class="meta-value">{{ movie.directedBy }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">主演：</span>
            <span class="meta-value">{{ movie.actor }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">类型：</span>
            <span class="meta-value">{{ movie.type }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">时长：</span>
            <span class="meta-value">{{ formatDuration(movie.time) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">上映时间：</span>
            <span class="meta-value">{{ movie.showTime ? new Date(movie.showTime).toLocaleDateString() : '未知' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">评分：</span>
            <span class="meta-value">
              <el-rate
                v-model="movie.rate"
                disabled
                text-color="#ff9900"
                score-template="{value}"
                show-score
              />
            </span>
          </div>
        </div>
        
        <div class="movie-description">
          <h3>剧情简介</h3>
          <p>{{ movie.abs }}</p>
          <div v-if="movie.info" class="movie-detail-info">
            <h3>详细信息</h3>
            <p>{{ movie.info }}</p>
          </div>
        </div>
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

.movie-player-page {
  min-height: calc(100vh - 120px);
  background-color: $background-color;
  padding: 20px;
}

.back-button {
  margin-bottom: 20px;
  
  .el-button {
    background-color: rgba($primary-color, 0.1);
    color: $primary-color;
    border: none;
    transition: all 0.3s;
    
    &:hover {
      background-color: rgba($primary-color, 0.2);
      transform: translateX(-5px);
    }
  }
}

.player-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.video-container {
  position: relative;
  width: 100%;
  background-color: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  
  &:fullscreen {
    border-radius: 0;
  }
}

.video-player {
  width: 100%;
  max-height: 70vh;
  display: block;
  cursor: pointer;
}

.custom-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 15px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  opacity: 0;
  transition: opacity 0.3s;
  
  .video-container:hover & {
    opacity: 1;
  }
}

.progress-container {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  cursor: pointer;
}

.progress-bar {
  flex: 1;
  height: 5px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  position: relative;
  margin-right: 10px;
  
  .progress-filled {
    background-color: $primary-color;
    height: 100%;
    border-radius: 5px;
    position: absolute;
    top: 0;
    left: 0;
  }
}

.time-display {
  color: white;
  font-size: 14px;
  min-width: 100px;
  text-align: right;
  
  span {
    margin: 0 2px;
  }
}

.controls-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 5px;
  margin-right: 10px;
  
  &:hover {
    color: $light-color;
  }
}

.volume-control {
  display: flex;
  align-items: center;
  
  .volume-slider {
    width: 80px;
    margin-left: 10px;
  }
}

.movie-info {
  background-color: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.movie-title {
  font-size: 28px;
  margin-bottom: 20px;
  color: $primary-color;
  font-weight: 600;
  border-left: 4px solid $primary-color;
  padding-left: 15px;
}

.movie-meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
  
  .meta-item {
    display: flex;
    align-items: flex-start;
    
    .meta-label {
      font-weight: 500;
      color: #666;
      min-width: 80px;
    }
    
    .meta-value {
      color: $text-color;
      flex: 1;
    }
  }
}

.movie-description {
  h3 {
    font-size: 18px;
    margin-bottom: 10px;
    color: $primary-color;
    font-weight: 500;
  }
  
  p {
    line-height: 1.8;
    color: $text-color;
    margin-bottom: 20px;
    text-align: justify;
  }
  
  .movie-detail-info {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid $border-color;
  }
}

@media (max-width: 768px) {
  .movie-meta {
    grid-template-columns: 1fr;
  }
}
</style> 