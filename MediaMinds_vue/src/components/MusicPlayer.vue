<template>
  <div class="music-player-container" :class="{ 
    'expanded': isExpanded,
    'player-side': playerPosition === 'side',
    'player-float': playerPosition === 'float'
  }">
    <!-- 迷你播放器 -->
    <div class="mini-player" @click="toggleExpand">
      <div class="mini-cover">
        <img :src="currentSong.pic || defaultCover" alt="封面">
        <div class="mini-play-btn" @click.stop="togglePlay">
          <el-icon>
            <component :is="isPlaying ? 'VideoPause' : 'VideoPlay'"></component>
          </el-icon>
        </div>
      </div>
      <div class="mini-info">
        <div class="mini-song-title">{{ currentSong.name || '未播放歌曲' }}</div>
        <div class="mini-artist">{{ currentSinger || '未知歌手' }}</div>
      </div>
      <div class="mini-controls">
        <el-button circle size="small" @click.stop="prevSong">
          <el-icon><Back /></el-icon>
        </el-button>
        <el-button circle size="small" @click.stop="togglePlay">
          <el-icon>
            <component :is="isPlaying ? 'VideoPause' : 'VideoPlay'"></component>
          </el-icon>
        </el-button>
        <el-button circle size="small" @click.stop="nextSong">
          <el-icon><Right /></el-icon>
        </el-button>
      </div>
      <!-- 添加位置切换按钮 -->
      <div class="position-control" @click.stop>
        <el-dropdown trigger="click" @command="handlePositionChange">
          <el-button circle size="small">
            <el-icon><Position /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="bottom">底部模式</el-dropdown-item>
              <el-dropdown-item command="side">侧边模式</el-dropdown-item>
              <el-dropdown-item command="float">悬浮模式</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 完整播放器 -->
    <div class="full-player" v-show="isExpanded">
      <div class="player-header">
        <el-button circle plain @click="toggleExpand">
          <el-icon><ArrowDown /></el-icon>
        </el-button>
        <h3>正在播放</h3>
        <div>
          <el-dropdown trigger="click" @command="handlePositionChange">
            <el-button circle plain>
              <el-icon><Position /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="bottom">底部模式</el-dropdown-item>
                <el-dropdown-item command="side">侧边模式</el-dropdown-item>
                <el-dropdown-item command="float">悬浮模式</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button circle plain @click="analyzeLyrics" title="AI分析歌词" :disabled="!currentSong.lyric">
            <el-icon><Cpu /></el-icon>
          </el-button>
          <el-button circle plain>
            <el-icon><More /></el-icon>
          </el-button>
        </div>
      </div>

      <div class="player-content">
        <div class="left-section">
          <div class="album-cover" :class="{ 'rotating': isPlaying }">
            <img :src="currentSong.pic || defaultCover" alt="专辑封面">
          </div>
          <div class="song-info">
            <h2>{{ currentSong.name || '未播放歌曲' }}</h2>
            <p>{{ currentSinger || '未知歌手' }}</p>
          </div>
          <div class="progress-bar">
            <span class="current-time">{{ formatTime(currentTime) }}</span>
            <el-slider v-model="progressPercentage" @change="handleProgressChange"></el-slider>
            <span class="total-time">{{ formatTime(duration) }}</span>
          </div>
          <div class="controls">
            <el-button circle @click="changePlayMode">
              <el-icon>
                <component :is="playMode === 'sequence' ? 'Sort' : (playMode === 'random' ? 'RefreshRight' : 'Refresh')"></component>
              </el-icon>
            </el-button>
            <el-button circle @click="prevSong">
              <el-icon><Back /></el-icon>
            </el-button>
            <el-button circle size="large" type="primary" @click="togglePlay">
              <el-icon>
                <component :is="isPlaying ? 'VideoPause' : 'VideoPlay'"></component>
              </el-icon>
            </el-button>
            <el-button circle @click="nextSong">
              <el-icon><Right /></el-icon>
            </el-button>
            <el-button circle @click="toggleMute">
              <el-icon>
                <component :is="isMuted ? 'Mute' : 'Microphone'"></component>
              </el-icon>
            </el-button>
          </div>
          <div class="volume-control">
            <el-icon><Microphone /></el-icon>
            <el-slider v-model="volume" @change="handleVolumeChange" :show-tooltip="false"></el-slider>
          </div>
        </div>

        <div class="right-section">
          <el-tabs v-model="activeTab" class="player-tabs">
            <el-tab-pane label="歌词" name="lyrics">
              <div class="lyrics-container" ref="lyricsContainer">
                <div v-if="parsedLyrics.length > 0">
                  <div class="lyrics-wrapper">
                    <!-- 添加空白填充，确保首行歌词不会太靠上 -->
                    <div class="lyric-padding"></div>
                    
                    <p 
                      v-for="(line, index) in parsedLyrics" 
                      :key="index" 
                      :class="{ 
                        'active-lyric': currentLyricIndex === index,
                        'pre-active-lyric': currentLyricIndex === index - 1,
                        'post-active-lyric': currentLyricIndex === index + 1,
                        'other-lyric': currentLyricIndex !== index && 
                                      currentLyricIndex !== index - 1 && 
                                      currentLyricIndex !== index + 1
                      }"
                    >
                      {{ line.text }}
                      
                      <!-- 当前行显示进度条 -->
                      <div v-if="currentLyricIndex === index" class="lyric-progress">
                        <div class="lyric-progress-inner" :style="{ width: `${currentLyricProgress}%` }"></div>
                      </div>
                    </p>
                    
                    <!-- 添加空白填充，确保最后一行歌词不会太靠下 -->
                    <div class="lyric-padding"></div>
                  </div>
                </div>
                <div v-else class="no-lyrics">
                  <p>暂无歌词</p>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="播放列表" name="playlist">
              <div class="playlist-container">
                <el-table
                  :data="playlist"
                  style="width: 100%"
                  @row-click="playSong"
                  highlight-current-row
                  :row-class-name="getRowClass"
                >
                  <el-table-column width="50">
                    <template #default="scope">
                      <el-button 
                        circle 
                        type="text" 
                        @click.stop="playSong(scope.row)">
                        <el-icon>
                          <component :is="currentSong.id === scope.row.id && isPlaying ? 'VideoPause' : 'VideoPlay'"></component>
                        </el-icon>
                      </el-button>
                    </template>
                  </el-table-column>
                  <el-table-column prop="name" label="歌曲"></el-table-column>
                  <el-table-column label="歌手">
                    <template #default="scope">
                      {{ getSingerName(scope.row.singerId) }}
                    </template>
                  </el-table-column>
                  <el-table-column width="60">
                    <template #default="scope">
                      <el-button
                        circle
                        type="text"
                        @click.stop="removeSongFromPlaylist(scope.$index)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <div class="playlist-actions">
                  <el-button size="small" @click="clearPlaylist">清空列表</el-button>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <!-- 音频元素 -->
    <audio 
      ref="audio" 
      @timeupdate="updateTime" 
      @loadedmetadata="onLoadedMetadata"
      @ended="onEnded"
      @error="onAudioError">
    </audio>
    
    <!-- AI分析对话框 -->
    <el-dialog
      v-model="showAIDialog"
      title="歌词AI情感分析"
      width="80%"
      class="ai-analysis-dialog"
      :close-on-click-modal="false"
      :destroy-on-close="true"
      append-to-body
    >
      <div v-if="aiAnalysisLoading" class="ai-loading-container">
        <div class="loader"></div>
        <p>AI正在分析歌词内容，请稍候...</p>
      </div>
      <div v-else-if="aiAnalysisError" class="ai-error-container">
        <el-icon class="error-icon"><WarningFilled /></el-icon>
        <p>{{ aiAnalysisError }}</p>
        <el-button type="primary" @click="analyzeLyrics">重试</el-button>
      </div>
      <div v-else-if="aiAnalysisResult" class="ai-analysis-content">
        <el-scrollbar height="60vh">
          <div class="analysis-section">
            <div class="analysis-text" v-html="aiAnalysisResult.replace(/\n/g, '<br>')"></div>
          </div>
        </el-scrollbar>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
// 导入必要的图标组件
import {
  VideoPlay,
  VideoPause,
  ArrowDown,
  Back,
  Right,
  More,
  Sort,
  RefreshRight,
  Refresh,
  Microphone,
  Mute,
  Delete,
  Position,
  Cpu
} from '@element-plus/icons-vue'
import { getLyricsAnalysisService } from '@/api/music.js'

// 默认封面图
const defaultCover = 'https://mediaminds.oss-cn-beijing.aliyuncs.com/songPic/default.jpg'

// 音频元素引用
const audio = ref(null)

// 播放器状态
const isExpanded = ref(false)
const isPlaying = ref(false)
const isMuted = ref(false)
const volume = ref(80)
const activeTab = ref('lyrics')
const currentTime = ref(0)
const duration = ref(0)
const currentLyricIndex = ref(0)
const playMode = ref('sequence') // sequence, random, loop
const playerPosition = ref('bottom') // 新增：播放器位置，默认为底部

// AI分析相关
const showAIDialog = ref(false)
const aiAnalysisLoading = ref(false)
const aiAnalysisResult = ref('')
const aiAnalysisError = ref('')

// 组件接收的属性
const props = defineProps({
  initialPlaylist: {
    type: Array,
    default: () => []
  },
  initialSong: {
    type: Object,
    default: () => ({})
  },
  singers: {
    type: Array,
    default: () => []
  }
})

// 组件emits
const emit = defineEmits(['update:playlist', 'update:current-song'])

// 播放列表和当前歌曲
const playlist = ref(props.initialPlaylist || [])
const currentSong = ref(props.initialSong || {})

// DOM引用
const lyricsContainer = ref(null)
const activeLyric = ref(null)

// 计算属性
const currentSinger = computed(() => {
  const singer = props.singers.find(s => s.id === currentSong.value.singerId)
  return singer ? singer.name : '未知歌手'
})

const progressPercentage = computed({
  get: () => {
    return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  },
  set: (val) => {
    if (audio.value) {
      const newTime = (val / 100) * duration.value
      currentTime.value = newTime
      audio.value.currentTime = newTime
    }
  }
})

const parsedLyrics = computed(() => {
  if (!currentSong.value.lyric) return []
  
  const lines = currentSong.value.lyric.split('\n')
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\](.*)/
  const result = []
  
  lines.forEach(line => {
    const match = timeRegex.exec(line)
    if (match) {
      const min = parseInt(match[1])
      const sec = parseInt(match[2])
      const hundredths = parseInt(match[3])
      const time = min * 60 + sec + hundredths / 100
      const text = match[4].trim()
      
      if (text) {
        result.push({ time, text })
      }
    }
  })
  
  return result.sort((a, b) => a.time - b.time)
})

// 计算下一行歌词的索引
const nextLyricIndex = computed(() => {
  // 如果没有歌词或已经是最后一行，返回当前索引
  if (parsedLyrics.value.length === 0 || currentLyricIndex.value >= parsedLyrics.value.length - 1) {
    return currentLyricIndex.value
  }
  return currentLyricIndex.value + 1
})

// 计算下一行歌词的时间距离（用于进度显示）
const nextLyricTimeDistance = computed(() => {
  if (nextLyricIndex.value <= currentLyricIndex.value || parsedLyrics.value.length <= 1) {
    return 0
  }
  
  const currentLyricTime = parsedLyrics.value[currentLyricIndex.value].time
  const nextLyricTime = parsedLyrics.value[nextLyricIndex.value].time
  
  return nextLyricTime - currentLyricTime
})

// 计算当前歌词进度（用于进度条显示）
const currentLyricProgress = computed(() => {
  if (nextLyricTimeDistance.value <= 0) {
    return 100
  }
  
  const currentLyricTime = parsedLyrics.value[currentLyricIndex.value].time
  const timePassedInCurrentLyric = currentTime.value - currentLyricTime
  
  return Math.min(100, (timePassedInCurrentLyric / nextLyricTimeDistance.value) * 100)
})

// 监听器
watch(() => props.initialPlaylist, (newVal) => {
  playlist.value = newVal || []
}, { immediate: true })

watch(() => props.initialSong, (newVal) => {
  if (newVal && newVal.id && newVal.id !== currentSong.value.id) {
    currentSong.value = newVal
    loadSong()
  }
}, { immediate: true })

watch(currentTime, (newTime) => {
  // 更新歌词显示
  if (parsedLyrics.value.length === 0) return
  
  let index = parsedLyrics.value.findIndex(lyric => lyric.time > newTime) - 1
  if (index < 0) index = 0
  
  if (index !== currentLyricIndex.value) {
    currentLyricIndex.value = index
    scrollToActiveLyric()
  }
})

// 方法
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const togglePlay = () => {
  if (!currentSong.value.url) {
    ElMessage.warning('当前没有可播放的歌曲')
    return
  }
  
  if (isPlaying.value) {
    audio.value.pause()
  } else {
    audio.value.play()
  }
  
  isPlaying.value = !isPlaying.value
}

const loadSong = () => {
  if (!currentSong.value || !currentSong.value.url) return
  
  if (audio.value) {
    // 修复URL格式
    // 如果URL是控制台链接而不是直接的音频链接，尝试修复
    let songUrl = currentSong.value.url
    
    // 检查URL是否为阿里云OSS控制台链接
    if (songUrl.includes('oss.console.aliyun.com')) {
      // 替换为真实的可访问音频URL
      // 这里假设真实的音频文件位于公开的OSS桶中
      // 您需要根据实际情况修改这个URL构建逻辑
      const songName = songUrl.split('/').pop()
      songUrl = `https://mediaminds.oss-cn-beijing.aliyuncs.com/song/${songName}`
      
      console.log('修复后的URL:', songUrl)
    }
    
    audio.value.src = songUrl
    audio.value.load()
    
    // 自动播放
    audio.value.play().then(() => {
      isPlaying.value = true
    }).catch(err => {
      console.error('播放失败:', err)
      isPlaying.value = false
      
      // 显示错误信息给用户
      ElMessage.error(`播放失败: ${err.message || '无法访问音频文件'}, 请检查音频URL是否正确`)
    })
    
    // 重置歌词索引
    currentLyricIndex.value = 0
  }
}

const updateTime = () => {
  if (audio.value) {
    currentTime.value = audio.value.currentTime
  }
}

const onLoadedMetadata = () => {
  if (audio.value) {
    duration.value = audio.value.duration
  }
}

const onEnded = () => {
  // 根据播放模式决定下一首
  switch (playMode.value) {
    case 'sequence':
      nextSong()
      break
    case 'random':
      playRandomSong()
      break
    case 'loop':
      // 循环当前歌曲
      audio.value.currentTime = 0
      audio.value.play()
      break
  }
}

const nextSong = () => {
  if (playlist.value.length <= 1) {
    ElMessage.info('播放列表中没有更多歌曲')
    return
  }
  
  const currentIndex = playlist.value.findIndex(song => song.id === currentSong.value.id)
  const nextIndex = (currentIndex + 1) % playlist.value.length
  
  currentSong.value = playlist.value[nextIndex]
  loadSong()
}

const prevSong = () => {
  if (playlist.value.length <= 1) {
    ElMessage.info('播放列表中没有更多歌曲')
    return
  }
  
  const currentIndex = playlist.value.findIndex(song => song.id === currentSong.value.id)
  const prevIndex = (currentIndex - 1 + playlist.value.length) % playlist.value.length
  
  currentSong.value = playlist.value[prevIndex]
  loadSong()
}

const playRandomSong = () => {
  if (playlist.value.length <= 1) {
    ElMessage.info('播放列表中没有更多歌曲')
    return
  }
  
  const randomIndex = Math.floor(Math.random() * playlist.value.length)
  currentSong.value = playlist.value[randomIndex]
  loadSong()
}

const formatTime = (time) => {
  if (!time) return '00:00'
  
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const handleProgressChange = (percentage) => {
  if (audio.value) {
    const newTime = (percentage / 100) * duration.value
    audio.value.currentTime = newTime
  }
}

const handleVolumeChange = (newVolume) => {
  if (audio.value) {
    audio.value.volume = newVolume / 100
    isMuted.value = newVolume === 0
  }
}

const toggleMute = () => {
  if (audio.value) {
    isMuted.value = !isMuted.value
    audio.value.muted = isMuted.value
  }
}

const changePlayMode = () => {
  const modes = ['sequence', 'random', 'loop']
  const currentIndex = modes.indexOf(playMode.value)
  const nextIndex = (currentIndex + 1) % modes.length
  playMode.value = modes[nextIndex]
  
  const modeNames = {
    sequence: '顺序播放',
    random: '随机播放',
    loop: '单曲循环'
  }
  
  ElMessage.success(`已切换为${modeNames[playMode.value]}`)
}

const playSong = (song) => {
  currentSong.value = song
  loadSong()
}

const removeSongFromPlaylist = (index) => {
  // 如果删除的是当前播放的歌曲
  if (playlist.value[index].id === currentSong.value.id) {
    // 如果列表中还有其他歌曲，播放下一首
    if (playlist.value.length > 1) {
      nextSong()
    } else {
      // 如果删除后列表为空，停止播放
      audio.value.pause()
      isPlaying.value = false
      currentSong.value = {}
    }
  }
  
  // 从播放列表中移除
  playlist.value.splice(index, 1)
  emit('update:playlist', playlist.value)
}

const clearPlaylist = () => {
  // 停止播放
  audio.value.pause()
  isPlaying.value = false
  currentSong.value = {}
  
  // 清空播放列表
  playlist.value = []
  emit('update:playlist', playlist.value)
}

const getSingerName = (singerId) => {
  const singer = props.singers.find(s => s.id === singerId)
  return singer ? singer.name : '未知歌手'
}

const getRowClass = ({ row }) => {
  return row.id === currentSong.value.id ? 'playing-song-row' : ''
}

const scrollToActiveLyric = () => {
  nextTick(() => {
    if (lyricsContainer.value) {
      const activeLines = document.querySelectorAll('.active-lyric')
      if (activeLines.length > 0) {
        const activeLine = activeLines[0]
        const container = lyricsContainer.value
        
        // 计算应该滚动的位置 - 将活动歌词滚动到容器中央
        const offsetTop = activeLine.offsetTop
        const containerHeight = container.clientHeight
        
        // 添加平滑滚动动画
        container.scrollTo({
          top: offsetTop - containerHeight / 2,
          behavior: 'smooth'
        })
      }
    }
  })
}

// 监听歌词索引变化，自动滚动到当前歌词
watch(currentLyricIndex, (newIndex) => {
  if (newIndex >= 0) {
    scrollToActiveLyric()
  }
})

// 处理位置变化
const handlePositionChange = (position) => {
  playerPosition.value = position
  
  // 保存用户偏好到本地存储
  localStorage.setItem('music_player_position', position)
  
  // 提示用户
  const positionNames = {
    bottom: '底部模式',
    side: '侧边模式',
    float: '悬浮模式'
  }
  ElMessage.success(`已切换到${positionNames[position]}`)
}

// 在组件挂载时从本地存储读取位置偏好
onMounted(() => {
  if (audio.value) {
    audio.value.volume = volume.value / 100
  }
  
  // 读取位置偏好
  const savedPosition = localStorage.getItem('music_player_position')
  if (savedPosition && ['bottom', 'side', 'float'].includes(savedPosition)) {
    playerPosition.value = savedPosition
  }
})

// 音频加载错误处理
const onAudioError = (e) => {
  console.error('音频加载错误:', e)
  isPlaying.value = false
  
  // 显示错误消息
  ElMessage.error({
    message: '音频加载失败，可能是链接无效或音频文件不存在',
    duration: 5000
  })
  
  // 如果错误是由于链接问题，尝试使用备用链接格式
  if (currentSong.value && currentSong.value.url) {
    const originalUrl = currentSong.value.url
    
    // 显示重试按钮
    ElMessageBox.confirm(
      '音频加载失败，要尝试其他可能的链接格式吗?',
      '播放错误',
      {
        confirmButtonText: '尝试备用链接',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      // 尝试其他可能的URL格式
      let alternativeUrl = originalUrl
      
      if (originalUrl.includes('mediaminds.oss-cn-beijing.aliyuncs.com/song/')) {
        // 尝试不同的路径
        const filename = originalUrl.split('/').pop()
        alternativeUrl = `https://mediaminds.oss-cn-beijing.aliyuncs.com/${filename}`
      } else if (originalUrl.includes('oss-cn-beijing.aliyuncs.com')) {
        // 也许问题是路径中的编码或格式
        const filename = originalUrl.split('/').pop()
        alternativeUrl = `https://mediaminds.oss-cn-beijing.aliyuncs.com/music/${filename}`
      }
      
      // 如果有替代URL，尝试加载
      if (alternativeUrl !== originalUrl) {
        console.log('尝试替代URL:', alternativeUrl)
        currentSong.value.url = alternativeUrl
        loadSong()
      } else {
        ElMessage.info('没有找到其他可能的链接格式')
      }
    }).catch(() => {
      // 用户取消了重试
    })
  }
}

// 向父组件暴露方法
defineExpose({
  addToPlaylist(song) {
    // 检查是否已在播放列表中
    const exists = playlist.value.some(item => item.id === song.id)
    if (!exists) {
      playlist.value.push(song)
      emit('update:playlist', playlist.value)
      ElMessage.success(`已将《${song.name}》加入播放列表`)
    }
    
    // 如果当前没有播放歌曲，自动播放新添加的歌曲
    if (!currentSong.value.id) {
      currentSong.value = song
      loadSong()
    }
  },
  play(song) {
    // 如果歌曲不在播放列表中，先添加
    const exists = playlist.value.some(item => item.id === song.id)
    if (!exists) {
      playlist.value.push(song)
      emit('update:playlist', playlist.value)
    }
    
    currentSong.value = song
    loadSong()
  }
})

// AI分析歌词
const analyzeLyrics = async () => {
  if (!currentSong.value || !currentSong.value.lyric) {
    ElMessage.warning('当前歌曲没有歌词可供分析')
    return
  }
  
  showAIDialog.value = true
  aiAnalysisLoading.value = true
  aiAnalysisResult.value = ''
  aiAnalysisError.value = ''
  
  try {
    // 处理歌词内容，去除时间标签
    const processedLyrics = parsedLyrics.value
      .map(line => line.text)
      .join('\n')
    
    // 使用当前用户名作为userId
    const userId = localStorage.getItem('username') || '用户'
    
    // 调用API获取AI分析结果
    const res = await getLyricsAnalysisService(processedLyrics, userId)
    
    if (res.code === 200) {
      aiAnalysisResult.value = res.data
    } else {
      aiAnalysisError.value = res.msg || '获取歌词分析失败'
    }
  } catch (error) {
    console.error('获取歌词分析错误', error)
    aiAnalysisError.value = '获取歌词分析出错：' + (error.message || '未知错误')
  } finally {
    aiAnalysisLoading.value = false
  }
}
</script>

<style scoped>
.music-player-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  transition: all 0.3s ease;
  max-height: 70px;
}

/* 侧边播放器样式 */
.music-player-container.player-side {
  left: auto;
  right: 0;
  top: 20%;
  bottom: 20%;
  width: 70px;
  max-height: 60vh;
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
}

.music-player-container.player-side.expanded {
  max-height: 60vh;
  width: 800px;
}

/* 悬浮播放器样式 */
.music-player-container.player-float {
  width: 300px;
  left: auto;
  right: 20px;
  bottom: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.music-player-container.player-float.expanded {
  width: 800px;
  max-height: 80vh;
  bottom: 20px;
  right: 20px;
}

.music-player-container.expanded {
  max-height: 80vh;
  bottom: 0;
}

/* 迷你播放器样式 */
.mini-player {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  height: 70px;
  cursor: pointer;
}

.player-side .mini-player {
  flex-direction: column;
  padding: 10px;
  height: 100%;
  justify-content: center;
}

.player-side .mini-cover {
  margin-right: 0;
  margin-bottom: 15px;
}

.player-side .mini-info {
  display: none;
}

.player-side .mini-controls {
  flex-direction: column;
  gap: 10px;
}

.player-side .position-control {
  margin-top: 15px;
}

.position-control {
  margin-left: 10px;
}

.mini-cover {
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 15px;
}

.mini-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini-play-btn {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.mini-cover:hover .mini-play-btn {
  opacity: 1;
}

.mini-play-btn i {
  color: #fff;
  font-size: 24px;
}

.mini-info {
  flex: 1;
  overflow: hidden;
}

.mini-song-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-artist {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-controls {
  display: flex;
  gap: 5px;
}

/* 完整播放器样式 */
.full-player {
  height: calc(80vh - 70px);
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.player-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.player-content {
  display: flex;
  height: calc(80vh - 120px);
  overflow: hidden;
}

.left-section {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.album-cover {
  width: 250px;
  height: 250px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-cover.rotating {
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.song-info {
  text-align: center;
  margin-bottom: 30px;
}

.song-info h2 {
  margin: 0 0 5px;
  font-size: 20px;
  font-weight: 500;
}

.song-info p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.progress-bar {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.progress-bar .el-slider {
  flex: 1;
  margin: 0 10px;
}

.current-time, .total-time {
  font-size: 12px;
  color: #909399;
  width: 40px;
  text-align: center;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.volume-control {
  display: flex;
  align-items: center;
  width: 200px;
}

.volume-control i {
  margin-right: 10px;
  color: #606266;
}

.volume-control .el-slider {
  flex: 1;
}

.right-section {
  flex: 1;
  border-left: 1px solid #ebeef5;
  overflow: hidden;
}

.player-tabs {
  height: 100%;
}

.player-tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow: hidden;
}

.player-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: auto;
}

/* 歌词样式 */
.lyrics-container {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  text-align: center;
  scroll-behavior: smooth;
  position: relative;
}

.lyrics-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  justify-content: center;
}

.lyric-padding {
  height: 40vh; /* 添加足够的空间使活动歌词居中显示 */
}

.lyrics-container p {
  position: relative;
  margin: 24px 0;
  padding: 4px 0;
  font-size: 14px;
  color: #909399;
  transition: all 0.3s ease;
  line-height: 1.5;
  opacity: 0.6;
}

.active-lyric {
  color: #409EFF !important;
  font-size: 18px !important;
  font-weight: 600;
  opacity: 1 !important;
  transform: scale(1.05);
  text-shadow: 0 0 10px rgba(64, 158, 255, 0.3);
}

.pre-active-lyric, .post-active-lyric {
  color: #606266 !important;
  font-size: 16px !important;
  opacity: 0.8 !important;
}

.other-lyric {
  opacity: 0.4;
  transform: scale(0.95);
}

.lyric-progress {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 2px;
  background-color: rgba(64, 158, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.lyric-progress-inner {
  height: 100%;
  background-color: #409EFF;
  border-radius: 2px;
  transition: width 0.1s linear;
}

/* 播放列表样式 */
.playlist-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.playlist-container .el-table {
  flex: 1;
  overflow-y: auto;
}

.playlist-actions {
  padding: 10px;
  text-align: right;
  border-top: 1px solid #ebeef5;
}

/* 播放中的行样式 */
:deep(.playing-song-row) {
  background-color: #f0f9eb;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background: #f5f7fa;
  border-radius: 3px;
}

/* 添加缺失的no-lyrics样式 */
.no-lyrics {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}

/* AI分析对话框样式 */
.ai-analysis-dialog {
  z-index: 2100 !important;
}

.ai-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.ai-loading-container .loader {
  width: 48px;
  height: 48px;
  border: 4px solid #e4e7ed;
  border-top-color: #409EFF;
  border-radius: 50%;
  animation: rotate 1s linear infinite;
  margin-bottom: 16px;
}

.ai-error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
}

.ai-error-container .error-icon {
  font-size: 48px;
  color: #f56c6c;
  margin-bottom: 16px;
}

.ai-error-container p {
  color: #f56c6c;
  font-size: 16px;
  margin-bottom: 20px;
  text-align: center;
}

.ai-analysis-content {
  padding: 20px;
}

.analysis-section {
  margin-bottom: 24px;
}

.analysis-text {
  line-height: 1.8;
  white-space: pre-line;
}
</style>
