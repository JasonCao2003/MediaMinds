import {createRouter, createWebHistory} from 'vue-router'
import useUserInfoStore from '@/stores/userInfo.js'
import { ElMessage } from 'element-plus'
import { cancelAllRequests } from '@/utils/request.js'
// 预加载可能导致问题的组件
import BookView from '@/views/user/BookView.vue'
import MusicView from '@/views/user/MusicView.vue'
import VideoView from '@/views/user/VideoView.vue'
import UserProfile from '@/views/user/UserProfile.vue'
import UserMessage from '@/views/user/Message.vue'
import WelcomeView from '@/views/user/WelcomeView.vue'
import UserLayout from '@/views/user/UserLayout.vue'
// 预加载管理员组件
import AdminLayout from '@/views/admin/AdminLayout.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import UserManagement from '@/views/admin/UserManagement.vue'
import MusicManagement from '@/views/admin/music/MusicManagement.vue'

// 书籍管理相关路由
const bookManageRoutes = [
  {
    path: '/admin/book/manage',
    name: 'BookManage',
    component: () => import('@/views/admin/book/BookManage.vue'),
    meta: { title: '图书管理', requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/admin/book/type',
    name: 'BookTypeManage',
    component: () => import('@/views/admin/book/BookTypeManage.vue'),
    meta: { title: '图书类型管理', requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/admin/book/chapter',
    name: 'BookChapterManage',
    component: () => import('@/views/admin/book/BookChapterManage.vue'),
    meta: { title: '图书章节管理', requiresAuth: true, roles: ['admin'] }
  }
]

// 音乐管理相关路由
const musicManageRoutes = [
  {
    path: '/admin/music/songs',
    name: 'SongManagement',
    component: () => import('@/views/admin/music/SongManagement.vue'),
    meta: { title: '歌曲管理', requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/admin/music/singers',
    name: 'SingerManagement',
    component: () => import('@/views/admin/music/SingerManagement.vue'),
    meta: { title: '歌手管理', requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/admin/music/songlists',
    name: 'SongListManagement',
    component: () => import('@/views/admin/music/SongListManagement.vue'),
    meta: { title: '歌单管理', requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/admin/music/comments',
    name: 'MusicCommentManagement',
    component: () => import('@/views/admin/music/CommentManagement.vue'),
    meta: { title: '音乐评论管理', requiresAuth: true, roles: ['admin'] }
  }
]

// 视频管理相关路由
const videoManageRoutes = [
  {
    path: '/admin/video/movies',
    name: 'MovieManage',
    component: () => import('@/views/admin/video/MovieManage.vue'),
    meta: { title: '电影管理', requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/admin/video/categories',
    name: 'VideoCategoryManage',
    component: () => import('@/views/admin/video/CategoryManage.vue'),
    meta: { title: '视频分类管理', requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/admin/video/comments',
    name: 'VideoCommentManage',
    component: () => import('@/views/admin/video/CommentManage.vue'),
    meta: { title: '视频评论管理', requiresAuth: true, roles: ['admin'] }
  }
]

// 文档管理路由
const documentManageRoutes = [
  {
    path: '/admin/document',
    name: 'DocumentManagement',
    component: () => import('@/views/admin/DocumentManager.vue'),
    meta: { title: '文档管理', requiresAuth: true, roles: ['admin'] }
  }
]

//定义路由关系
const routes = [
    // 公共路由
    {
        path: '/login', 
        name: 'Login',
        component: () => import('@/views/Login.vue'),
        meta: { title: '登录', requiresAuth: false }
    },
    {
        path: '/404', 
        name: 'NotFound',
        component: () => import('@/views/NotFound.vue'),
        meta: { title: '页面未找到', requiresAuth: false }
    },
    
    // 普通用户路由
    {
        path: '/content',
        component: UserLayout,
        meta: { title: '内容浏览', requiresAuth: true },
        children: [
            {
                path: '',
                name: 'Welcome',
                component: WelcomeView,
                meta: { title: '欢迎', icon: 'HomeFilled' }
            },
            {
                path: 'book',
                name: 'Book',
                component: () => import('@/views/user/BookView.vue'),
                meta: { title: '图书浏览', icon: 'Document' }
            },
            {
                path: 'book/read/:id',
                name: 'BookReader',
                component: () => import('@/views/user/BookReader.vue'),
                meta: { title: '在线阅读', hideInMenu: true }
            },
            {
                path: 'video',
                name: 'Video',
                component: VideoView,
                meta: { title: '视频浏览', icon: 'VideoCamera' }
            },
            {
                path: 'movie/play/:id',
                name: 'MoviePlayer',
                component: () => import('@/views/user/MoviePlayer.vue'),
                meta: { title: '视频播放', hideInMenu: true }
            },
            {
                path: 'music',
                name: 'Music',
                component: MusicView,
                meta: { title: '音乐浏览', icon: 'Headset' }
            },
            {
                path: 'profile',
                name: 'UserProfile',
                component: UserProfile,
                meta: { title: '个人信息', icon: 'User' }
            },
            {
                path: 'message',
                name: 'UserMessage',
                component: UserMessage,
                meta: { title: '消息中心', icon: 'ChatDotRound' }
            },
            {
                path: 'document',
                name: 'UserDocument',
                component: () => import('@/views/user/DocumentManager.vue'),
                meta: { title: '文档管理', icon: 'Document' }
            }
        ]
    },
    
    // 管理员路由
    {
        path: '/',
        component: AdminLayout,
        redirect: '/admin/dashboard',
        meta: { title: '管理后台', requiresAdmin: true, requiresAuth: true },
        children: [
            {
                path: '/admin/dashboard', 
                name: 'AdminDashboard',
                component: AdminDashboard,
                meta: { title: '控制面板', icon: 'Monitor' }
            },
            // 用户管理
            {
                path: '/admin/users', 
                name: 'UserManagement',
                component: UserManagement,
                meta: { title: '用户管理', icon: 'User' }
            },
            // 音乐管理 - 重定向到歌曲管理
            {
                path: '/admin/music',
                redirect: '/admin/music/songs',
                meta: { title: '音乐管理', icon: 'Headset' }
            },
            // 视频管理 - 重定向到电影管理
            {
                path: '/admin/video',
                redirect: '/admin/video/movies',
                meta: { title: '视频管理', icon: 'VideoCamera' }
            },
            // 书籍管理
            ...bookManageRoutes,
            // 音乐管理
            ...musicManageRoutes,
            // 视频管理
            ...videoManageRoutes,
            // 文档管理
            ...documentManageRoutes
        ]
    },
    
    // 404页面 - 放在最后，匹配所有未找到的路径
    {
        path: '/:pathMatch(.*)*',
        redirect: '/404'
    }
]

//创建路由器
const router = createRouter({
    history: createWebHistory(),
    routes: routes,
    scrollBehavior(to, from, savedPosition) {
        // 如果有保存的位置则恢复保存的位置
        if (savedPosition) {
            return savedPosition
        }
        // 否则滚动到顶部
        return { top: 0 }
    }
})

// 路由守卫
router.beforeEach((to, from, next) => {
    // 切换路由时取消所有挂起的请求，防止Promise取消错误
    cancelAllRequests();
    
    // 设置页面标题
    if (to.meta.title) {
        document.title = `MediaMinds - ${to.meta.title}`
    } else {
        document.title = 'MediaMinds'
    }
    
    // 检查是否需要登录权限
    const token = localStorage.getItem('token')
    const userInfoStore = useUserInfoStore()
    
    // 未登录且需要登录权限，重定向到登录页
    if (to.meta.requiresAuth && !token) {
        ElMessage.error('请先登录')
        next({ path: '/login', query: { redirect: to.fullPath } })
        return
    }
    
    // 检查是否需要管理员权限
    if (to.meta.requiresAdmin) {
        // 如果路由需要管理员权限，检查用户是否是管理员
        if (!userInfoStore.isAdmin()) {
            ElMessage.error('您没有管理员权限')
            next('/content')
            return
        }
    }
    
    // 根路径重定向
    if (to.path === '/') {
        if (token) {
            if (userInfoStore.isAdmin()) {
                next('/admin/dashboard')
            } else {
                next('/content')
            }
        } else {
            next('/login')
        }
    }
    
    // 其他情况正常通过
    next()
})

//导出路由
export default router
