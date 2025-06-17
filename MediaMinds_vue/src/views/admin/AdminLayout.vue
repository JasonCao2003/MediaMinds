<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import useUserInfoStore from '@/stores/userInfo.js'
import { useTokenStore } from '@/stores/token.js'
import websocketService from '@/utils/websocketService'

const router = useRouter()
const userInfoStore = useUserInfoStore()
const tokenStore = useTokenStore()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 退出登录
const logout = () => {
  // 断开WebSocket连接
  websocketService.disconnect()
  // 清除登录信息
  tokenStore.removeToken()
  userInfoStore.removeInfo()
  router.push('/login')
}
</script>

<template>
  <div class="admin-layout">
    <el-container class="layout-container">
      <el-aside :width="isCollapse ? '64px' : '200px'" class="aside">
        <div class="logo-container">
          <img src="@/assets/logo.png" alt="Logo" class="logo" v-if="!isCollapse" />
          <img src="@/assets/logo-small.png" alt="Logo" class="logo-small" v-else />
        </div>
        <el-menu
          :default-active="$route.path"
          class="el-menu-vertical"
          :collapse="isCollapse"
          router
          background-color="#001529"
          text-color="#fff"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/admin/dashboard">
            <el-icon><el-icon-monitor /></el-icon>
            <template #title>控制面板</template>
          </el-menu-item>
          
          <el-sub-menu index="/admin/book">
            <template #title>
              <el-icon><el-icon-reading /></el-icon>
              <span>图书管理</span>
            </template>
            <el-menu-item index="/admin/book/manage">
              <el-icon><el-icon-document /></el-icon>
              <template #title>图书管理</template>
            </el-menu-item>
            <el-menu-item index="/admin/book/type">
              <el-icon><el-icon-collection-tag /></el-icon>
              <template #title>图书类型管理</template>
            </el-menu-item>
            <el-menu-item index="/admin/book/chapter">
              <el-icon><el-icon-files /></el-icon>
              <template #title>图书章节管理</template>
            </el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="/admin/music">
            <template #title>
              <el-icon><el-icon-headset /></el-icon>
              <span>音乐管理</span>
            </template>
            <el-menu-item index="/admin/music/songs">
              <el-icon><el-icon-video-play /></el-icon>
              <template #title>歌曲管理</template>
            </el-menu-item>
            <el-menu-item index="/admin/music/singers">
              <el-icon><el-icon-user /></el-icon>
              <template #title>歌手管理</template>
            </el-menu-item>
            <el-menu-item index="/admin/music/songlists">
              <el-icon><el-icon-menu /></el-icon>
              <template #title>歌单管理</template>
            </el-menu-item>
            <el-menu-item index="/admin/music/comments">
              <el-icon><el-icon-chat-dot-square /></el-icon>
              <template #title>评论管理</template>
            </el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="/admin/video">
            <template #title>
              <el-icon><el-icon-video-camera /></el-icon>
              <span>视频管理</span>
            </template>
            <el-menu-item index="/admin/video/movies">
              <el-icon><el-icon-film /></el-icon>
              <template #title>电影管理</template>
            </el-menu-item>
            <el-menu-item index="/admin/video/categories">
              <el-icon><el-icon-collection-tag /></el-icon>
              <template #title>分类管理</template>
            </el-menu-item>
            <el-menu-item index="/admin/video/comments">
              <el-icon><el-icon-chat-dot-square /></el-icon>
              <template #title>评论管理</template>
            </el-menu-item>
          </el-sub-menu>
          
          <el-menu-item index="/admin/document">
            <el-icon><el-icon-document /></el-icon>
            <template #title>文档管理</template>
          </el-menu-item>
          
          <el-menu-item index="/admin/users">
            <el-icon><el-icon-user /></el-icon>
            <template #title>用户管理</template>
          </el-menu-item>
        
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="header">
          <div class="header-left">
            <el-button
              type="text"
              :icon="isCollapse ? 'el-icon-s-unfold' : 'el-icon-s-fold'"
              @click="isCollapse = !isCollapse"
              class="toggle-btn"
            />
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/admin/dashboard' }">管理后台</el-breadcrumb-item>
              <el-breadcrumb-item>{{ $route.meta.title || '页面' }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <el-dropdown trigger="click">
              <div class="user-info">
                <el-avatar :size="32" :src="userInfoStore.info.avatar || ''" />
                <span class="username">{{ userInfoStore.info.nickName || '管理员' }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
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

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
  overflow: hidden;
}

.layout-container {
  height: 100%;
}

.aside {
  background-color: #001529;
  transition: width 0.3s;
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

.logo-small {
  height: 30px;
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
}

.toggle-btn {
  margin-right: 20px;
  font-size: 18px;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
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
  width: 200px;
  min-height: 400px;
}
</style> 