import './utils/polyfill'

import './assets/main.scss'

import {createApp} from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router/index.js'
import App from './App.vue'
import {createPinia} from 'pinia'
import {createPersistedState} from 'pinia-persistedstate-plugin'
import locale from 'element-plus/dist/locale/zh-cn.js'

// 导入图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 导入NProgress进度条
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
NProgress.configure({
  easing: 'ease',  // 动画方式
  speed: 500,      // 递增进度条的速度
  showSpinner: false, // 是否显示加载ico
  trickleSpeed: 200,  // 自动递增间隔
  minimum: 0.3       // 初始化时的最小百分比
})

// 路由切换时显示进度条
router.beforeEach((to, from, next) => {
  NProgress.start()
  next()
})
router.afterEach(() => {
  NProgress.done()
})

const app = createApp(App);
const pinia = createPinia();
const persist = createPersistedState();
pinia.use(persist)
app.use(pinia)
app.use(router)
app.use(ElementPlus, {locale});

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 启动应用
app.mount('#app')
