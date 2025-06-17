<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTokenStore } from '@/stores/token.js'
import useUserInfoStore from '@/stores/userInfo.js'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { userInfoService } from '@/api/user'
import websocketService from '@/utils/websocketService'

// 状态管理
const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()
const router = useRouter()
const route = useRoute()

// 用户信息
const userInfo = ref({
  userName: '',
  nickName: '',
  email: '',
  role: '',
  avatar: ''
})

// 搜索相关
const searchKeyword = ref('')

// 获取用户信息
const getUserInfo = async () => {
  try {
    const res = await userInfoService()
    if (res.code === 200 && res.data) {
      // 将用户信息保存到store中
      userInfoStore.setInfo(res.data)
      // 设置本地用户信息
      userInfo.value = {
        userName: res.data.userName || '用户',
        nickName: res.data.nickName || '',
        email: res.data.email || '',
        role: res.data.role || 'user',
        avatar: res.data.avatar || '/default-avatar.png'
      }
    }
  } catch (error) {
    ElMessage.error('获取用户信息失败，请重新登录')
  }
}

// 退出登录
const logout = () => {
  // 断开WebSocket连接
  websocketService.disconnect()
  // 实现登出逻辑
  tokenStore.removeToken()
  userInfoStore.removeInfo()
  ElMessage.success('已成功退出登录')
  router.push('/login')
}

// 处理搜索
const handleSearch = () => {
  if (!searchKeyword.value.trim()) return
  
  // 获取当前路径的第一级路径作为模块
  const pathParts = route.path.split('/')
  const module = pathParts[1] || 'book'
  
  // 跳转到对应模块的搜索页面
  router.push({
    path: `/${module}/search`,
    query: { keyword: searchKeyword.value }
  })
}

// 获取路由信息生成菜单数据
const menuItems = computed(() => {
  // 从路由配置中获取菜单项
  return router.options.routes
    .find(r => r.path === '/')?.children || []
})

// 检查用户角色
onMounted(() => {
  getUserInfo()
  
  // 如果是管理员，提供管理后台入口的提示
  if (userInfoStore.isAdmin()) {
    ElMessage({
      message: '您是管理员，可以通过右上角下拉菜单进入管理后台',
      type: 'success',
      duration: 3000
    })
  }
})
</script>

<template>
  <div class="dashboard-container">
    <el-container>
      <el-aside width="220px" class="aside">
        <div class="logo-container">
          <img src="@/assets/logo.png" alt="Logo" class="logo" />
        </div>
        
        <el-menu
          :default-active="route.path"
          class="el-menu-vertical"
          router
          background-color="#001529"
          text-color="#fff"
          active-text-color="#409EFF"
        >
          <template v-for="item in menuItems" :key="item.path">
            <!-- 有子菜单的情况 -->
            <el-sub-menu v-if="item.children && item.children.length" :index="item.path">
              <template #title>
                <el-icon v-if="item.meta && item.meta.icon">
                  <component :is="'el-icon-' + item.meta.icon" />
                </el-icon>
                <span>{{ item.meta ? item.meta.title : item.path }}</span>
              </template>
              
              <el-menu-item 
                v-for="child in item.children" 
                :key="child.path" 
                :index="item.path + '/' + child.path"
              >
                <el-icon v-if="child.meta && child.meta.icon">
                  <component :is="'el-icon-' + child.meta.icon" />
                </el-icon>
                <span>{{ child.meta ? child.meta.title : child.path }}</span>
              </el-menu-item>
            </el-sub-menu>
            
            <!-- 没有子菜单的情况 -->
            <el-menu-item v-else :index="item.path">
              <el-icon v-if="item.meta && item.meta.icon">
                <component :is="'el-icon-' + item.meta.icon" />
              </el-icon>
              <span>{{ item.meta ? item.meta.title : item.path }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="header">
          <div class="header-left">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索..."
              prefix-icon="Search"
              @keyup.enter="handleSearch"
              clearable
              class="search-input"
            >
              <template #append>
                <el-button @click="handleSearch">搜索</el-button>
              </template>
            </el-input>
          </div>
          
          <div class="header-right">
            <el-dropdown trigger="click">
              <div class="user-info">
                <el-avatar :size="32" :src="userInfoStore.info.avatar || ''" />
                <span class="username">{{ userInfoStore.info.nickName || userInfoStore.info.userName || '用户' }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="router.push('/user/profile')">个人资料</el-dropdown-item>
                  <el-dropdown-item v-if="userInfoStore.isAdmin()" @click="router.push('/admin/dashboard')">
                    管理后台
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
$primary-color: #3a7bd5;
$primary-gradient: linear-gradient(to right, #3a7bd5, #3a6073);
$secondary-color: #3b82f6;
$success-color: #10b981;
$warning-color: #f59e0b;
$danger-color: #ef4444;
$text-color: #1e293b;
$text-light: #64748b;
$background-color: #f8fafc;
$border-color: #e2e8f0;
$sidebar-bg: #1a1c23;
$sidebar-active: #2d3748;
$card-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

.dashboard-container {
  height: 100vh;
  overflow: hidden;
}

.aside {
  background-color: #001529;
  overflow: hidden;
}

.logo-container {
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #002140;
  overflow: hidden;
}

.logo {
  height: 40px;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #f5f5f5;
  }
}

.username {
  margin-left: 10px;
  color: #333;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

.el-menu-vertical:not(.el-menu--collapse) {
  width: 100%;
  min-height: calc(100vh - 60px);
}
</style> 