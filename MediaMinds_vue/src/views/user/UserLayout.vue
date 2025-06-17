<script setup>
import { ref, computed, onMounted, onUnmounted, watch, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTokenStore } from '@/stores/token.js'
import useUserInfoStore from '@/stores/userInfo.js'
import websocketService from '@/utils/websocketService'
import GlobalMusicPlayer from '@/components/GlobalMusicPlayer.vue'
import { ElMessage } from 'element-plus'
// 导入所需的Element Plus图标
import { 
  ArrowDown, 
  User, 
  ChatDotRound, 
  SwitchButton,
  House,
  Document,
  VideoCamera,
  Headset,
  Bell
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 未读消息数量
const unreadMessages = ref(0)

// 控制播放器显示
const showMusicPlayer = ref(true)
const globalMusicPlayerRef = ref(null)

// 播放列表数据
const playlist = ref([])

// 从本地存储加载播放列表
const loadPlaylistFromStorage = () => {
  try {
    const storedPlaylist = localStorage.getItem('global_music_playlist')
    if (storedPlaylist) {
      playlist.value = JSON.parse(storedPlaylist)
    }
  } catch (error) {
    console.error('从本地存储加载播放数据失败:', error)
  }
}

// 计算是否应该显示播放器（播放列表不为空且用户角色为普通用户时显示）
const shouldShowPlayer = computed(() => {
  console.log('播放器状态检查：', {
    showMusicPlayer: showMusicPlayer.value,
    playlistLength: playlist.value.length,
    isUser: userInfoStore.isUser(),
    userRole: userInfoStore.role
  })
  // 确保在用户布局中显示播放器
  return showMusicPlayer.value && userInfoStore.isUser()
})

// 创建音乐播放器全局方法
const globalMusicPlayer = {
  // 全局播放歌曲
  play(song) {
    if (globalMusicPlayerRef.value) {
      globalMusicPlayerRef.value.play(song)
      // 确保播放列表已更新
      loadPlaylistFromStorage()
    } else {
      ElMessage.warning('音乐播放器未就绪')
    }
  },
  
  // 添加到播放列表
  addToPlaylist(song) {
    if (globalMusicPlayerRef.value) {
      globalMusicPlayerRef.value.addToPlaylist(song)
      // 确保播放列表已更新
      loadPlaylistFromStorage()
    } else {
      ElMessage.warning('音乐播放器未就绪')
    }
  },
  
  // 播放整个歌单
  playList(songs) {
    if (globalMusicPlayerRef.value && songs && songs.length > 0) {
      globalMusicPlayerRef.value.playList(songs)
      // 确保播放列表已更新
      playlist.value = songs
    } else {
      ElMessage.warning('音乐播放器未就绪或歌单为空')
    }
  }
}

// 将播放器方法提供给所有组件
provide('globalMusicPlayer', globalMusicPlayer)

// 退出登录
const logout = () => {
  // 断开WebSocket连接
  websocketService.disconnect()
  // 清除登录信息
  tokenStore.removeToken()
  userInfoStore.removeInfo()
  router.push('/login')
}

// 根据当前路由计算激活的菜单
const activeMenu = computed(() => {
  // 如果是/content主路径，不高亮任何菜单项
  if (route.path === '/content') {
    return '/content'
  }
  return route.path
})

// 页面标题
const pageTitle = computed(() => {
  switch(route.path) {
    case '/content': return '首页';
    case '/content/book': return '图书浏览';
    case '/content/video': return '视频浏览';
    case '/content/music': return '音乐浏览';
    case '/content/message': return '消息中心';
    case '/content/profile': return '个人信息';
    case '/content/document': return '文档管理';
    default: return 'MediaMinds';
  }
})

// WebSocket消息处理函数
const handleWebSocketMessage = (message) => {
  // 只处理特定类型的消息，避免重复处理
  // 添加处理标记，只处理与通知计数相关的消息
  if (message.target === 'notification_counter' || message.type === 'notification_count' || 
      message.type === 'new_notification' || message.type === 'clear_notifications') {
    
    // 根据消息类型处理
    if (message.type === 'notification_count') {
      // 设置消息数量
      unreadMessages.value = message.count || 0
    } else if (message.type === 'new_notification') {
      // 收到新消息，增加计数
      unreadMessages.value++
    } else if (message.type === 'clear_notifications') {
      // 清空通知
      unreadMessages.value = 0
    }
    
    // 标记消息已被处理，阻止默认的通知显示
    message.showNotification = false
  }
}

// 当路由变化到消息页面时，发送已读请求
watch(() => route.path, (newPath) => {
  if (newPath === '/content/message') {
    // 当导航到消息页面时，发送已读请求
    websocketService.sendMessage('/app/mark-read', {
      userId: userInfoStore.info.userId,
      action: 'mark_all_read'
    })
    // 本地也清零计数
    unreadMessages.value = 0
  }
})

onMounted(() => {
  // 注册WebSocket消息处理函数
  websocketService.onMessage(handleWebSocketMessage)
  
  // 连接后请求未读消息数量
  if (websocketService.connected) {
    requestNotificationCount()
  } else {
    // 如果未连接，监听连接成功事件
    const checkConnection = setInterval(() => {
      if (websocketService.connected) {
        requestNotificationCount()
        clearInterval(checkConnection)
      }
    }, 1000)
  }
  
  // 加载播放列表
  loadPlaylistFromStorage()
  
  // 如果播放列表为空，初始化一个示例歌曲以确保播放器显示
  if (playlist.value.length === 0 && userInfoStore.isUser()) {
    playlist.value = [{
      id: 'demo-song',
      name: '示例歌曲',
      pic: 'https://mediaminds.oss-cn-beijing.aliyuncs.com/songPic/default.jpg',
      url: '',
      singerId: ''
    }]
    // 保存到本地存储
    localStorage.setItem('global_music_playlist', JSON.stringify(playlist.value))
  }
  
  window.$musicPlayer = globalMusicPlayer
})

onUnmounted(() => {
  // 组件卸载时移除消息处理回调
  websocketService.offMessage(handleWebSocketMessage)
})

// 请求获取未读消息数量
const requestNotificationCount = () => {
  websocketService.sendMessage('/app/get-notification-count', {
    userId: userInfoStore.info.userId
  })
}
</script>

<template>
  <div class="user-layout">
    <el-container class="content-container">
      <el-aside :width="isCollapse ? '64px' : '240px'" class="aside">
        <div class="logo-container">
          <img src="@/assets/logo.png" alt="Logo" class="logo" v-if="!isCollapse" />
          <img src="@/assets/logo-small.png" alt="Logo" class="logo-small" v-else />
        </div>
        
        <div class="menu-wrapper">
          <el-menu
            :default-active="activeMenu"
            class="sidebar-menu"
            :collapse="isCollapse"
            router
            background-color="transparent"
            text-color="rgba(255, 255, 255, 0.8)"
            active-text-color="#ffffff"
          >
            <!-- 首页 -->
            <el-menu-item index="/content" class="menu-item">
              <el-icon><House /></el-icon>
              <template #title>首页</template>
            </el-menu-item>
            
            <!-- 分割线 -->
            <div class="menu-divider"></div>
            
            <!-- 分类标题 -->
            <div class="menu-title" v-if="!isCollapse">媒体库</div>
            
            <!-- 图书浏览 -->
            <el-menu-item index="/content/book" class="menu-item">
              <el-icon><Document /></el-icon>
              <template #title>图书浏览</template>
            </el-menu-item>
            
            <!-- 视频浏览 -->
            <el-menu-item index="/content/video" class="menu-item">
              <el-icon><VideoCamera /></el-icon>
              <template #title>视频浏览</template>
            </el-menu-item>
            
            <!-- 音乐浏览 -->
            <el-menu-item index="/content/music" class="menu-item">
              <el-icon><Headset /></el-icon>
              <template #title>音乐浏览</template>
            </el-menu-item>
            
            <!-- 文档管理 -->
            <el-menu-item index="/content/document" class="menu-item">
              <el-icon><Document /></el-icon>
              <template #title>文档管理</template>
            </el-menu-item>
          </el-menu>
        </div>
      </el-aside>

      <el-container class="main-container">
        <el-header class="header">
          <div class="header-left">
            <button 
              class="toggle-btn" 
              @click="isCollapse = !isCollapse"
              :class="{ 'is-collapsed': isCollapse }"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <h2 class="page-title">{{ pageTitle }}</h2>
          </div>
          
          <div class="header-right">
            <div class="action-icons">
              <button class="action-btn" @click="router.push('/content/message')">
                <el-badge :value="unreadMessages" :hidden="unreadMessages === 0" class="notification-badge">
                  <el-icon><Bell /></el-icon>
                </el-badge>
              </button>
            </div>
            
            <div class="user-info-container">
              <el-dropdown trigger="click">
                <div class="user-info">
                  <el-avatar :size="36" :src="userInfoStore.info.avatar || ''" class="user-avatar" />
                  <div class="user-details">
                    <span class="username">{{ userInfoStore.info.nickName || userInfoStore.info.userName || '用户' }}</span>
                    <span class="user-role">普通用户</span>
                  </div>
                  <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
                </div>
                <template #dropdown>
                  <el-dropdown-menu class="custom-dropdown">
                    <el-dropdown-item @click="router.push('/content/profile')">
                      <el-icon><User /></el-icon>个人信息
                    </el-dropdown-item>
                    <el-dropdown-item @click="router.push('/content/message')">
                      <el-icon><ChatDotRound /></el-icon>消息中心
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="logout">
                      <el-icon><SwitchButton /></el-icon>退出登录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-header>

        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade-transform" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
    
    <!-- 持久化播放器组件，仅当播放列表有内容且用户登录且角色为普通用户时显示 -->
    <GlobalMusicPlayer v-if="shouldShowPlayer" ref="globalMusicPlayerRef" @update:playlist="playlist = $event" />
  </div>
</template>

<style scoped lang="scss">
// 现代化配色方案
$primary-color: #6366f1;  // 淡紫色主色调
$primary-light: #818cf8;
$primary-dark: #4338ca;
$secondary-color: #10b981; // 薄荷绿
$bg-color: #f9fafb;
$aside-bg: linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%);
$text-color: #1f2937;
$text-secondary: #6b7280;
$border-color: #e5e7eb;
$header-bg: #ffffff;
$card-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

// 基础布局
.user-layout {
  height: 100vh;
  overflow: hidden;
  background-color: $bg-color;
}

.content-container {
  height: 100%;
}

// 侧边栏样式
.aside {
  background: $aside-bg;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 10;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
    opacity: 0.1;
    pointer-events: none;
  }
}

.logo-container {
  height: 64px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 16px;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 15%;
    width: 70%;
    height: 1px;
    background: linear-gradient(90deg, 
      rgba(255,255,255,0) 0%, 
      rgba(255,255,255,0.3) 50%, 
      rgba(255,255,255,0) 100%);
  }
}

.logo {
  height: 38px;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.4));
  transition: all 0.3s ease;
}

.logo-small {
  height: 32px;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.4));
  transition: all 0.3s ease;
}

// 菜单容器
.menu-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 0;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
}

// 新的菜单样式
.sidebar-menu {
  border-right: none !important;
  width: 100%;
  background-color: transparent;
}

.menu-item {
  margin: 8px 12px;
  height: 50px !important;
  line-height: 50px !important;
  border-radius: 10px;
  transition: all 0.3s;
  
  .el-icon {
    margin-right: 12px;
    font-size: 18px;
  }
  
  &.is-active {
    background-color: rgba(255, 255, 255, 0.15) !important;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      height: 20px;
      width: 4px;
      background: #fff;
      border-radius: 0 4px 4px 0;
    }
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }
}

// 分割线
.menu-divider {
  height: 1px;
  margin: 16px 24px;
  background: linear-gradient(90deg, 
    rgba(255,255,255,0) 0%, 
    rgba(255,255,255,0.2) 50%, 
    rgba(255,255,255,0) 100%);
}

// 分类标题
.menu-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 0 24px;
  margin: 12px 0;
}

// 折叠菜单样式
:deep(.el-menu--collapse) {
  .menu-item {
    margin: 8px auto;
    width: 48px;
    height: 48px !important;
    
    .el-icon {
      margin: 0;
      font-size: 20px;
    }
  }
}

// 主容器
.main-container {
  background-color: $bg-color;
  border-radius: 16px 0 0 16px;
  margin-left: -12px;
  overflow: hidden;
  flex: 1;
  z-index: 5;
}

// 顶部导航栏
.header {
  background-color: $header-bg;
  border-bottom: 1px solid $border-color;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.8);
}

.header-left {
  display: flex;
  align-items: center;
}

.page-title {
  margin-left: 20px;
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(45deg, $primary-color, $primary-light);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  letter-spacing: 0.5px;
}

// 汉堡菜单按钮
.toggle-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: rgba($primary-color, 0.05);
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  padding: 0;
  
  &:hover {
    background-color: rgba($primary-color, 0.1);
  }
  
  span {
    display: block;
    width: 18px;
    height: 2px;
    border-radius: 2px;
    background-color: $primary-color;
    transition: all 0.3s ease;
  }
  
  &.is-collapsed {
    span:nth-child(1) {
      transform: translateY(6px) rotate(45deg);
    }
    
    span:nth-child(2) {
      opacity: 0;
    }
    
    span:nth-child(3) {
      transform: translateY(-6px) rotate(-45deg);
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

// 操作按钮组
.action-icons {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  color: $text-secondary;
  
  &:hover {
    background-color: rgba($primary-color, 0.08);
    color: $primary-color;
  }
  
  .el-icon {
    font-size: 18px;
  }
}

:deep(.notification-badge .el-badge__content) {
  background-color: $secondary-color;
  box-shadow: 0 4px 12px rgba($secondary-color, 0.4);
}

// 用户信息区域
.user-info-container {
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 40px;
  transition: all 0.3s ease;
  background-color: rgba($primary-color, 0.05);
  
  &:hover {
    background-color: rgba($primary-color, 0.1);
  }
}

.user-avatar {
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.user-details {
  margin: 0 12px 0 10px;
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: $text-color;
  line-height: 1.2;
}

.user-role {
  font-size: 12px;
  color: $text-secondary;
}

.dropdown-icon {
  font-size: 12px;
  color: $text-secondary;
  margin-left: 4px;
}

// 下拉菜单
:deep(.custom-dropdown) {
  min-width: 160px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: $card-shadow;
  border: none;
  
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    
    .el-icon {
      margin-right: 10px;
      font-size: 16px;
    }
    
    &:hover {
      background-color: rgba($primary-color, 0.05);
      color: $primary-color;
    }
  }
  
  .el-dropdown-menu__item--divided {
    border-top-color: $border-color;
    
    &:before {
      background-color: $header-bg;
    }
  }
}

// 内容区域
.main-content {
  background-color: $bg-color;
  padding: 20px 24px;
  padding-bottom: calc(20px + 80px); /* 增加底部安全区域，80px是播放器的基本高度 */
  overflow-y: auto;
  transition: all 0.3s ease;
  
  // 内容区域的滚动条样式
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba($primary-color, 0.2);
    border-radius: 10px;
  }
  
  // 模块卡片通用样式
  :deep(.el-card) {
    border-radius: 12px;
    border: none;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    margin-bottom: 20px;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08);
    }
    
    .el-card__header {
      border-bottom: 1px solid rgba($border-color, 0.6);
      padding: 16px 20px;
    }
    
    .el-card__body {
      padding: 20px;
    }
  }
  
  // 全局按钮样式
  :deep(.el-button) {
    border-radius: 8px;
    font-weight: 500;
    
    &.el-button--primary {
      background: linear-gradient(45deg, $primary-color, $primary-light);
      border: none;
      box-shadow: 0 4px 10px rgba($primary-color, 0.2);
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 15px rgba($primary-color, 0.3);
      }
    }
  }
}

// 页面过渡动画
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

// 响应式调整
@media (max-width: 768px) {
  .aside {
    position: absolute;
    height: 100%;
    z-index: 1000;
  }
  
  .main-container {
    margin-left: 0;
    border-radius: 0;
  }
  
  .user-details {
    display: none;
  }
}
</style> 