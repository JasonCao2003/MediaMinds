<template>
  <div class="book-reader" :class="currentTheme" :style="readerStyle">
    <!-- 顶部导航栏 -->
    <header class="reader-header">
      <div class="left-section">
        <button class="icon-button back-button" @click="goBack">
          <el-icon><Back /></el-icon>
          <span>返回</span>
        </button>
      </div>
      
      <div class="center-section">
        <h1 class="book-title">{{ bookInfo.title }}</h1>
      </div>
      
      <div class="right-section">
        <el-tooltip content="获取AI概要" placement="bottom">
          <button class="icon-button" @click="showAISummary" :disabled="loading || !chapterContent">
            <el-icon><Cpu /></el-icon>
          </button>
        </el-tooltip>
        
        <el-tooltip content="收藏章节" placement="bottom">
          <button class="icon-button" @click="toggleFavoriteChapter" :disabled="loading || !currentChapter">
            <el-icon><component :is="isChapterFavorite ? 'StarFilled' : 'Star'" /></el-icon>
          </button>
        </el-tooltip>
        
        <el-tooltip content="设置" placement="bottom">
          <button class="icon-button" @click="showSettings = true">
            <el-icon><Setting /></el-icon>
          </button>
        </el-tooltip>
        
        <el-tooltip content="目录" placement="bottom">
          <button class="icon-button" @click="toggleChapterList">
            <el-icon><Notebook /></el-icon>
          </button>
        </el-tooltip>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="reader-main" :class="{ 'sidebar-open': showChapterList }">
      <!-- 侧边栏章节列表 -->
      <aside class="chapter-sidebar" v-show="showChapterList">
        <div class="sidebar-header">
          <h2>目录</h2>
          <el-input 
            v-model="searchChapter" 
            placeholder="搜索章节" 
            prefix-icon="Search" 
            clearable
            class="search-input"
          />
        </div>
        
        <div class="chapter-list">
          <el-scrollbar>
            <div 
              v-for="chapter in filteredChapters" 
              :key="chapter.id"
              class="chapter-item"
              :class="{ 'active': currentChapter && chapter.id === currentChapter.id }"
              @click="loadChapter(chapter)"
            >
              <span class="chapter-number">{{ chapter.chapterNumber }}</span>
              <div class="chapter-details">
                <span class="chapter-title">{{ chapter.chapterTitle }}</span>
                <span class="chapter-word-count">{{ chapter.wordCount }}字</span>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </aside>

      <!-- 阅读区域 -->
      <section class="content-area">
        <!-- 章节信息 -->
        <div class="chapter-info">
          <div class="chapter-navigation">
            <button 
              class="nav-button prev"
              :disabled="!prevChapter" 
              @click="loadChapter(prevChapter)"
            >
              <el-icon><ArrowLeft /></el-icon>
              <span>上一章</span>
            </button>
            
            <h2 class="chapter-title">{{ currentChapter?.chapterTitle || '加载中...' }}</h2>
            
            <button 
              class="nav-button next"
              :disabled="!nextChapter" 
              @click="loadChapter(nextChapter)"
            >
              <span>下一章</span>
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>
        </div>
        
        <!-- 章节内容 -->
        <div 
          class="reading-content" 
          ref="contentRef" 
          :style="contentStyle"
          :class="{ 'is-loading': loading }"
        >
          <div v-if="loading" class="loading-container">
            <div class="loader"></div>
            <p>正在加载章节内容...</p>
          </div>
          
          <div v-else-if="!chapterContent" class="empty-content">
            <el-empty description="暂无内容" />
          </div>
          
          <div v-else class="chapter-content">
            <p v-for="(paragraph, index) in formattedContent" :key="index">{{ paragraph }}</p>
            
            <!-- 底部导航按钮 -->
            <div class="bottom-navigation">
              <button 
                class="nav-button prev"
                :disabled="!prevChapter" 
                @click="loadChapter(prevChapter)"
              >
                <el-icon><ArrowLeft /></el-icon>
                <span>上一章</span>
              </button>
              
              <h3 class="chapter-title">{{ currentChapter?.chapterTitle }}</h3>
              
              <button 
                class="nav-button next"
                :disabled="!nextChapter" 
                @click="loadChapter(nextChapter)"
              >
                <span>下一章</span>
                <el-icon><ArrowRight /></el-icon>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 阅读设置面板 -->
    <el-drawer
      v-model="showSettings"
      title="阅读设置"
      direction="rtl"
      size="300px"
      :show-close="true"
      :with-header="true"
      class="settings-drawer"
    >
      <div class="settings-container">
        <div class="setting-group">
          <h3>字体大小</h3>
          <div class="size-controls">
            <button class="size-button decrease" @click="decreaseFontSize">
              <el-icon><Minus /></el-icon>
            </button>
            <span class="size-value">{{ fontSize }}px</span>
            <button class="size-button increase" @click="increaseFontSize">
              <el-icon><Plus /></el-icon>
            </button>
          </div>
          <el-slider
            v-model="fontSize"
            :min="12"
            :max="28"
            :step="1"
            @change="saveSettings"
          />
        </div>

        <div class="setting-group">
          <h3>行间距</h3>
          <el-slider
            v-model="lineHeight"
            :min="1.2"
            :max="2.5"
            :step="0.1"
            :format-tooltip="value => value.toFixed(1)"
            @change="saveSettings"
          />
        </div>

        <div class="setting-group">
          <h3>主题</h3>
          <div class="theme-options">
            <div
              v-for="theme in themes"
              :key="theme.name"
              class="theme-option"
              :class="{ 'active': currentTheme === theme.name }"
              :style="{ backgroundColor: theme.bgColor, color: theme.textColor }"
              @click="selectTheme(theme.name)"
            >
              <span>Aa</span>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- AI概要对话框 -->
    <el-dialog
      v-model="showAIDialog"
      title="文章AI概要分析"
      width="80%"
      class="ai-summary-dialog"
      :close-on-click-modal="false"
      :destroy-on-close="true"
      append-to-body
    >
      <div v-if="aiSummaryLoading" class="ai-loading-container">
        <div class="loader"></div>
        <p>AI正在分析文章内容，请稍候...</p>
      </div>
      <div v-else-if="aiSummaryError" class="ai-error-container">
        <el-icon class="error-icon"><WarningFilled /></el-icon>
        <p>{{ aiSummaryError }}</p>
        <el-button type="primary" @click="showAISummary">重试</el-button>
      </div>
      <div v-else-if="aiSummary" class="ai-summary-content">
        <el-scrollbar height="60vh">
          <div class="summary-section">
            <div class="summary-text" v-html="formattedSummary"></div>
          </div>
        </el-scrollbar>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Back, ArrowLeft, ArrowRight, Notebook, Setting, 
  Search, Minus, Plus, Close, Cpu, WarningFilled, Star, StarFilled 
} from '@element-plus/icons-vue'
import { getBookByIdService } from '@/api/book.js'
import { getAllChaptersService, getChapterByIdService, getChapterContentService, getNovelSummaryService, addFavoriteService, deleteFavoriteByBookService, getFavoriteChaptersService } from '@/api/book.js'
import { cancelAllRequests } from '@/utils/request.js'

const route = useRoute()
const router = useRouter()
const bookId = ref(null)
const bookInfo = ref({})
const chapters = ref([])
const currentChapter = ref(null)
const chapterContent = ref('')
const loading = ref(false)
const showChapterList = ref(false) // 默认不显示章节列表
const contentRef = ref(null)

// 设置相关
const showSettings = ref(false)
const fontSize = ref(18)
const lineHeight = ref(1.8)
const currentTheme = ref('default')

// 主题定义
const themes = [
  { 
    name: 'default', 
    bgColor: '#f8f9fa', 
    contentBgColor: '#ffffff', 
    textColor: '#333333',
    label: '默认' 
  },
  { 
    name: 'sepia', 
    bgColor: '#f9f5eb', 
    contentBgColor: '#f5efe0', 
    textColor: '#5c4b36',
    label: '复古' 
  },
  { 
    name: 'night', 
    bgColor: '#1a1a1a', 
    contentBgColor: '#262626', 
    textColor: '#e0e0e0',
    label: '夜间' 
  },
  { 
    name: 'green', 
    bgColor: '#eef8ee', 
    contentBgColor: '#f7fcf7',
    textColor: '#274e2b',
    label: '护眼' 
  },
]

// 获取当前主题
const getCurrentTheme = computed(() => {
  return themes.find(theme => theme.name === currentTheme.value) || themes[0]
})

// 计算样式
const readerStyle = computed(() => {
  const theme = getCurrentTheme.value
  return {
    '--bg-color': theme.bgColor,
    '--content-bg-color': theme.contentBgColor,
    '--text-color': theme.textColor,
  }
})

const contentStyle = computed(() => {
  return {
    fontSize: `${fontSize.value}px`,
    lineHeight: lineHeight.value,
  }
})

// 调整字体大小
const increaseFontSize = () => {
  if (fontSize.value < 28) {
    fontSize.value++
    saveSettings()
  }
}

const decreaseFontSize = () => {
  if (fontSize.value > 12) {
    fontSize.value--
    saveSettings()
  }
}

// 章节搜索
const searchChapter = ref('')

// 计算过滤后的章节列表
const filteredChapters = computed(() => {
  if (!searchChapter.value) return chapters.value
  
  const keyword = searchChapter.value.toLowerCase()
  return chapters.value.filter(chapter => 
    chapter.chapterTitle.toLowerCase().includes(keyword) || 
    chapter.chapterNumber.toString().includes(keyword)
  )
})

// 计算上一章和下一章
const chapterIndex = computed(() => {
  if (!currentChapter.value) return -1
  return chapters.value.findIndex(c => c.id === currentChapter.value.id)
})

const prevChapter = computed(() => {
  const idx = chapterIndex.value
  return idx > 0 ? chapters.value[idx - 1] : null
})

const nextChapter = computed(() => {
  const idx = chapterIndex.value
  return idx < chapters.value.length - 1 ? chapters.value[idx + 1] : null
})

// 格式化章节内容，将文本按段落分割
const formattedContent = computed(() => {
  if (!chapterContent.value) return []
  return chapterContent.value
    .split('\n')
    .filter(line => line.trim() !== '') // 过滤空行
    .map(line => line.trim())
})

// 返回图书列表
const goBack = () => {
  router.push('/content/book')
}

// 切换章节列表显示
const toggleChapterList = () => {
  showChapterList.value = !showChapterList.value
}

// 选择主题
const selectTheme = (themeName) => {
  currentTheme.value = themeName
  saveSettings()
}

// 保存设置
const saveSettings = () => {
  const settings = {
    fontSize: fontSize.value,
    lineHeight: lineHeight.value,
    theme: currentTheme.value
  }
  localStorage.setItem('reader-settings', JSON.stringify(settings))
}

// 加载设置
const loadSettings = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('reader-settings'))
    if (settings) {
      fontSize.value = settings.fontSize || 18
      lineHeight.value = settings.lineHeight || 1.8
      currentTheme.value = settings.theme || 'default'
    }
  } catch (error) {
    console.error('加载设置出错', error)
  }
}

// 获取图书信息
const fetchBookInfo = async () => {
  try {
    const res = await getBookByIdService(bookId.value)
    if (res.code === 200) {
      bookInfo.value = res.data
      document.title = `${res.data.title} - 阅读中`
    } else {
      ElMessage.error('获取图书信息失败')
    }
  } catch (error) {
    console.error('获取图书信息错误', error)
    ElMessage.error('获取图书信息出错')
  }
}

// 获取章节列表
const fetchChapters = async () => {
  try {
    const res = await getAllChaptersService(bookId.value)
    if (res.code === 200) {
      chapters.value = res.data
      
      // 如果当前没有选中章节，默认选中第一章
      if (chapters.value.length > 0 && !currentChapter.value) {
        loadChapter(chapters.value[0])
      }
    } else {
      ElMessage.error('获取章节列表失败')
    }
  } catch (error) {
    console.error('获取章节列表错误', error)
    ElMessage.error('获取章节列表出错')
  }
}

// 加载章节内容
const loadChapter = async (chapter) => {
  if (!chapter) return
  
  loading.value = true
  currentChapter.value = chapter
  chapterContent.value = ''
  
  // 如果目录是打开的，在移动端自动关闭
  if (window.innerWidth <= 768 && showChapterList.value) {
    showChapterList.value = false
  }
  
  try {
    const res = await getChapterContentService(chapter.id)
    if (res.code === 200) {
      chapterContent.value = res.data
    } else {
      ElMessage.error('获取章节内容失败')
      chapterContent.value = ''
    }
    
    // 滚动到顶部
    nextTick(() => {
      if (contentRef.value) {
        contentRef.value.scrollTop = 0
      }
    })
  } catch (error) {
    console.error('获取章节内容错误', error)
    ElMessage.error('获取章节内容失败')
    chapterContent.value = ''
  } finally {
    loading.value = false
  }
}

// 设置视口元标签以支持iOS安全区域
const setViewportMeta = () => {
  let meta = document.querySelector('meta[name="viewport"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'viewport'
    document.head.appendChild(meta)
  }
  meta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover'
}

// 检测键盘事件用于翻页
const handleKeyDown = (e) => {
  if (e.key === 'ArrowLeft' && prevChapter.value) {
    loadChapter(prevChapter.value)
  } else if (e.key === 'ArrowRight' && nextChapter.value) {
    loadChapter(nextChapter.value)
  }
}

// AI概要相关
const showAIDialog = ref(false)
const aiSummary = ref('')
const aiSummaryLoading = ref(false)
const aiSummaryError = ref('')

// 格式化AI概要，将markdown格式转换为HTML
const formattedSummary = computed(() => {
  if (!aiSummary.value) return ''
  
  // 替换markdown标题和列表
  let formatted = aiSummary.value
    // 处理标题
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 处理有序列表
    .replace(/(\d+)\. (.*?)(?=\n|$)/g, '<div class="list-item"><span class="list-number">$1.</span> $2</div>')
    // 处理段落
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
  
  return formatted
})

// 显示AI概要
const showAISummary = async () => {
  if (!chapterContent.value) {
    ElMessage.warning('请先加载章节内容')
    return
  }
  
  showAIDialog.value = true
  aiSummaryLoading.value = true
  aiSummary.value = ''
  aiSummaryError.value = ''
  
  try {
    // 处理内容，去除空行，连成一块
    const processedContent = chapterContent.value
      .split('\n')
      .filter(line => line.trim() !== '')
      .join('')
    
    // 使用当前用户名作为userId
    const userId = localStorage.getItem('username') || '用户'
    
    // 调用API获取AI概要
    const res = await getNovelSummaryService(processedContent, userId)
    console.log('AI概要返回数据:', res)
    
    if (res.code === 200) {
      // 简化处理逻辑，尝试从不同格式中提取内容
      try {
        // 如果是对象格式
        if (res.data && typeof res.data === 'object' && res.data.data) {
          aiSummary.value = res.data.data
        } 
        // 如果是字符串格式但可能是JSON
        else if (typeof res.data === 'string' && res.data.includes('{')) {
          try {
            // 尝试提取JSON部分
            const jsonStart = res.data.indexOf('{')
            const jsonEnd = res.data.lastIndexOf('}') + 1
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
              const jsonStr = res.data.substring(jsonStart, jsonEnd)
              const parsedData = JSON.parse(jsonStr)
              if (parsedData.data) {
                aiSummary.value = parsedData.data
              } else {
                aiSummary.value = res.data
              }
            } else {
              aiSummary.value = res.data
            }
          } catch (e) {
            // JSON解析失败，直接使用原始字符串
            aiSummary.value = res.data
          }
        }
        // 其他情况直接使用返回的数据
        else {
          aiSummary.value = res.data
        }
      } catch (e) {
        console.error('处理AI概要数据出错', e)
        // 出错时直接使用原始数据
        aiSummary.value = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
      }
    } else {
      aiSummaryError.value = res.msg || '获取AI概要失败'
    }
  } catch (error) {
    console.error('获取AI概要错误', error)
    aiSummaryError.value = '获取AI概要出错：' + (error.message || '未知错误')
  } finally {
    aiSummaryLoading.value = false
  }
}

// 收藏相关
const favoriteChapters = ref([])
const isChapterFavorite = computed(() => {
  if (!currentChapter.value) return false
  return favoriteChapters.value.some(chapter => chapter.id === currentChapter.value.id)
})

// 获取收藏的章节列表
const fetchFavoriteChapters = async () => {
  try {
    const res = await getFavoriteChaptersService(bookId.value)
    if (res.code === 200) {
      favoriteChapters.value = res.data || []
    }
  } catch (error) {
    console.error('获取收藏章节错误', error)
  }
}

// 切换章节收藏状态
const toggleFavoriteChapter = async () => {
  if (!currentChapter.value) return
  
  try {
    if (isChapterFavorite.value) {
      // 取消收藏章节
      const res = await deleteFavoriteByBookService(bookId.value, currentChapter.value.id)
      if (res.code === 200) {
        ElMessage.success('取消收藏成功')
        await fetchFavoriteChapters()
      } else {
        ElMessage.error('取消收藏失败')
      }
    } else {
      // 添加收藏
      const favoriteData = {
        bookId: bookId.value,
        chapterId: currentChapter.value.id
      }
      const res = await addFavoriteService(favoriteData)
      if (res.code === 200) {
        ElMessage.success('收藏成功')
        await fetchFavoriteChapters()
      } else {
        ElMessage.error('收藏失败')
      }
    }
  } catch (error) {
    console.error('操作收藏错误', error)
    ElMessage.error('操作收藏失败')
  }
}

onMounted(async () => {
  // 设置视口元标签
  setViewportMeta()
  
  // 加载用户设置
  loadSettings()
  
  // 添加键盘事件
  window.addEventListener('keydown', handleKeyDown)
  
  bookId.value = parseInt(route.params.id)
  if (!bookId.value) {
    ElMessage.error('无效的图书ID')
    goBack()
    return
  }
  
  // 加载图书信息和章节列表
  await fetchBookInfo()
  await fetchChapters()
  await fetchFavoriteChapters()
})

// 组件卸载前取消所有挂起的请求和事件监听
onBeforeUnmount(() => {
  cancelAllRequests()
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped lang="scss">
// 使用CSS变量来实现主题切换
.book-reader {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --border-color: #e2e8f0;
  --shadow-color: rgba(0, 0, 0, 0.1);
  --bg-color: #f8f9fa;
  --content-bg-color: #ffffff;
  --text-color: #333333;
  --sidebar-width: 300px;
  
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden; /* 确保没有溢出滚动 */
  background-color: var(--bg-color);
  color: var(--text-color);
  position: relative;
  transition: all 0.3s ease;
}

// 主题类
.book-reader.night {
  --shadow-color: rgba(0, 0, 0, 0.3);
}

// 顶部导航
.reader-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: var(--content-bg-color);
  box-shadow: 0 2px 10px var(--shadow-color);
  position: relative;
  z-index: 10;
  
  .left-section, .right-section {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .center-section {
    flex: 1;
    text-align: center;
  }
  
  .book-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-color);
  }
  
  .icon-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-color);
    transition: all 0.2s;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    .el-icon {
      font-size: 18px;
    }
  }
  
  .back-button {
    display: flex;
    align-items: center;
    gap: 5px;
    width: auto;
    padding: 0 12px;
    border-radius: 20px;
    
    span {
      font-size: 14px;
      font-weight: 500;
    }
  }
}

// 主内容区
.reader-main {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

// 侧边栏
.chapter-sidebar {
  width: var(--sidebar-width);
  background-color: var(--content-bg-color);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: transform 0.3s ease;
  z-index: 9;
  
  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
    
    h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: var(--text-color);
    }
    
    .search-input {
      width: 100%;
    }
  }
  
  .chapter-list {
    flex: 1;
    overflow: hidden;
    
    .el-scrollbar {
      height: 100%;
    }
    
    .chapter-item {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.2s;
      position: relative;
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.02);
      }
      
      &.active {
        background-color: rgba(0, 0, 0, 0.05);
        
        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 4px;
          background-color: var(--primary-color);
          border-radius: 0 4px 4px 0;
        }
        
        .chapter-title {
          color: var(--primary-color);
          font-weight: 600;
        }
      }
      
      .chapter-number {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 50%;
        font-size: 14px;
        font-weight: 500;
        color: var(--secondary-color);
        margin-right: 12px;
        flex-shrink: 0;
      }
      
      .chapter-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .chapter-title {
        font-size: 15px;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .chapter-word-count {
        font-size: 12px;
        color: var(--secondary-color);
      }
    }
  }
}

// 内容区域
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 100%; /* 确保内容区域不超过父容器高度 */
  
  // 章节信息
  .chapter-info {
    padding: 16px 20px;
    background-color: var(--content-bg-color);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 10;
    
    .chapter-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      
      .chapter-title {
        margin: 0;
        text-align: center;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-color);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .nav-button {
        min-width: 100px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background-color: var(--content-bg-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-color);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0 12px;
        flex-shrink: 0;
        
        &:hover:not(:disabled) {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
          color: white;
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .el-icon {
          font-size: 16px;
        }
      }
    }
  }
  
  // 阅读内容
  .reading-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    padding-bottom: 24px; /* 恢复底部padding，确保内容底部有间距 */
    line-height: 1.8;
    position: relative;
    height: 100%; /* 确保内容区域占满容器高度 */
    display: flex;
    flex-direction: column;
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 0;
      
      .loader {
        width: 48px;
        height: 48px;
        border: 4px solid var(--border-color);
        border-top-color: var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }
      
      p {
        color: var(--secondary-color);
        font-size: 14px;
      }
    }
    
    .chapter-content {
      max-width: 800px;
      margin: 0 auto;
      background-color: var(--content-bg-color);
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px var(--shadow-color);
      margin-bottom: 24px; /* 添加底部外边距，确保底部有空间 */
      flex: none; /* 改为none，不再强制占满剩余空间 */
      
      p {
        margin-bottom: 24px;
        text-indent: 2em;
        font-size: inherit;
        line-height: inherit;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      // 底部导航按钮样式
      .bottom-navigation {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid var(--border-color);
        
        .nav-button {
          min-width: 120px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background-color: var(--content-bg-color);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-color);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0 16px;
          flex-shrink: 0;
          
          &:hover:not(:disabled) {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
            color: white;
          }
          
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .el-icon {
            font-size: 16px;
          }
        }
        
        .chapter-title {
          margin: 0;
          text-align: center;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-color);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding: 0 10px;
        }
      }
    }
  }
}

// 设置抽屉
.settings-drawer {
  .settings-container {
    padding: 24px;
    
    .setting-group {
      margin-bottom: 32px;
      
      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-color);
      }
      
      .size-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        
        .size-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--content-bg-color);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          
          &:hover {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
            color: white;
          }
        }
        
        .size-value {
          margin: 0 20px;
          font-size: 16px;
          font-weight: 500;
          min-width: 50px;
          text-align: center;
        }
      }
      
      .theme-options {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        
        .theme-option {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 2px solid transparent;
          box-shadow: 0 2px 6px var(--shadow-color);
          transition: all 0.2s;
          
          span {
            font-size: 20px;
            font-weight: bold;
          }
          
          &:hover {
            transform: translateY(-2px);
          }
          
          &.active {
            border-color: var(--primary-color);
            transform: scale(1.05);
          }
        }
      }
    }
  }
}

// 动画
@keyframes spin {
  to { transform: rotate(360deg); }
}

// AI概要对话框样式
.ai-summary-dialog {
  z-index: 2100 !important;
  
  .ai-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
    
    .loader {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border-color);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    
    p {
      color: var(--secondary-color);
      font-size: 14px;
    }
  }
  
  .ai-error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px 0;
    
    .error-icon {
      font-size: 48px;
      color: #f56c6c;
      margin-bottom: 16px;
    }
    
    p {
      color: #f56c6c;
      font-size: 16px;
      margin-bottom: 20px;
      text-align: center;
    }
  }
  
  .ai-summary-content {
    padding: 20px;
    
    .summary-section {
      margin-bottom: 24px;
      
      h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--primary-color);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 8px;
      }
      
      .summary-text {
        line-height: 1.8;
        text-indent: 2em;
        margin-bottom: 12px;
        
        strong {
          color: var(--primary-color);
          font-weight: 600;
          display: block;
          margin: 16px 0 8px 0;
          font-size: 16px;
          text-indent: 0;
        }
        
        strong:first-child {
          margin-top: 0;
        }
        
        .list-item {
          margin: 8px 0;
          display: flex;
          text-indent: 0;
          
          .list-number {
            color: var(--primary-color);
            font-weight: 600;
            margin-right: 8px;
            flex-shrink: 0;
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .reader-header {
    .book-title {
      max-width: 150px;
    }
    
    .back-button span {
      display: none;
    }
  }
  
  .chapter-sidebar {
    position: fixed;
    top: 60px;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
    box-shadow: 2px 0 10px var(--shadow-color);
  }
  
  .sidebar-open .chapter-sidebar {
    transform: translateX(0);
  }
  
  .content-area {
    .chapter-info {
      .chapter-navigation {
        .nav-button {
          min-width: auto;
          
          span {
            display: none;
          }
        }
      }
    }
    
    .reading-content {
      padding: 16px;
      
      .chapter-content {
        padding: 20px;
        box-shadow: none;
        
        .bottom-navigation {
          margin-top: 30px;
          
          .nav-button {
            min-width: auto;
            padding: 0 12px;
            
            span {
              display: none;
            }
          }
          
          .chapter-title {
            font-size: 14px;
          }
        }
      }
    }
  }
}
</style>

