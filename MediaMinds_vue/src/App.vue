<script setup>
import { ref, provide, onMounted, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import useUserInfoStore from '@/stores/userInfo.js'
import { userInfoService } from '@/api/user.js'
import { useTokenStore } from '@/stores/token.js'
import websocketService from '@/utils/websocketService' // 直接导入WebSocket服务


// 获取用户信息
const userInfoStore = useUserInfoStore()
// 获取token
const tokenStore = useTokenStore()

// 重新获取用户信息
const refreshUserInfo = async () => {
  if (tokenStore.getToken()) {
    try {
      const result = await userInfoService()
      if (result.code === 200) {
        userInfoStore.setInfo(result.data)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }
}

// 监控WebSocket连接状态
const checkWebSocketStatus = () => {
  // 直接使用导入的websocketService，而不是通过app.config.globalProperties
  if (websocketService && !websocketService.connected && !websocketService.connecting) {
    console.warn('检测到WebSocket连接已断开，尝试重新连接...');
    
    // 如果有全局重连函数就使用它
    if (window.reconnectWebSocket) {
      window.reconnectWebSocket();
    } else {
      // 否则尝试直接重连
      websocketService.connect();
    }
  }
};

// 创建定时器检查WebSocket连接状态
let wsCheckInterval = null;

onMounted(async () => {
  // 如果用户信息不完整，重新获取用户信息
  if (tokenStore.getToken() && (!userInfoStore.isLoggedIn() || !userInfoStore.role)) {
    await refreshUserInfo()
  }
  
  // 输出调试信息
  console.log('App挂载完成:', {
    token: !!tokenStore.getToken(),
    userInfo: userInfoStore.info,
    isLoggedIn: userInfoStore.isLoggedIn(),
    role: userInfoStore.role,
    isUser: userInfoStore.isUser()
  })
  
  // 每30秒检查一次WebSocket状态
  wsCheckInterval = setInterval(checkWebSocketStatus, 30000);
})

onBeforeUnmount(() => {
  // 清除定时器
  if (wsCheckInterval) {
    clearInterval(wsCheckInterval);
    wsCheckInterval = null;
  }
  
  // 断开WebSocket连接 - 直接使用导入的websocketService
  if (websocketService) {
    websocketService.disconnect();
  }
})
</script>

<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
/* 全局过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>
