<script setup>
import { ref, onMounted, reactive, onUnmounted } from 'vue'
import useUserInfoStore from '@/stores/userInfo.js'
import { useRouter } from 'vue-router'
import websocketService from '@/utils/websocketService'
import { getContentCategoryService } from '@/api/admin.js'

// 导入Element Plus图标
import {
  Document,
  VideoCamera,
  Headset
} from '@element-plus/icons-vue'

const router = useRouter()
const userInfoStore = useUserInfoStore()
const displayName = ref(userInfoStore.info.nickName || userInfoStore.info.userName || '用户')
const currentTime = ref('')
const greeting = ref('')
const quote = ref({})
// WebSocket连接状态
const isConnected = ref(false)
// 定义连接状态检查定时器
let connectionTimer = null

// 格言数组
const quotes = [
  { text: "生活不是等待风暴过去，而是学会在雨中跳舞。", author: "薇薇安·格林" },
  { text: "创造力就是智力在玩耍。", author: "爱因斯坦" },
  { text: "每一个不曾起舞的日子，都是对生命的辜负。", author: "尼采" },
  { text: "做你热爱的事，成功就会追随你。", author: "无名氏" },
  { text: "你的时间有限，所以不要浪费时间活在别人的生活里。", author: "乔布斯" },
  { text: "世界上那些最美好的事物，都是免费的。", author: "爱默生" },
  { text: "我们必须接受失望，因为它是有限的，但千万不可失去希望，因为它是无穷的。", author: "马丁·路德·金" },
  { text: "把每一个平凡的日子，变成美好的回忆。", author: "无名氏" },
  { text: "知识就是力量。", author: "培根" },
  { text: "今天你所种下的思想，明天将会收获成行动，后天会收获成习惯，最终会收获成你的性格和命运。", author: "佚名" }
]

// 数据统计
const stats = reactive({
  books: 0,
  videos: 0,
  music: 0,
  loading: true
})

// 生成随机数
const getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 获取今日格言
const getRandomQuote = () => {
  const randomIndex = getRandomNumber(0, quotes.length - 1)
  return quotes[randomIndex]
}

// 跳转到消息中心
const goToMessageCenter = () => {
  router.push('/content/message')
}

// 加载内容统计数据
const loadContentStats = async () => {
  try {
    stats.loading = true
    const result = await getContentCategoryService()
    
    stats.books = result.books || 0
    stats.videos = result.movies || 0
    stats.music = result.songs || 0
    
    console.log('获取内容统计数据成功:', stats)
  } catch (error) {
    console.error('获取内容统计数据失败:', error)
    // 加载失败时使用默认数据
    stats.books = 1245
    stats.videos = 857
    stats.music = 1634
  } finally {
    stats.loading = false
  }
}

// 获取当前时间和问候语
onMounted(() => {
  updateTime()
  setInterval(updateTime, 60000) // 每分钟更新一次时间
  
  // 设置今日格言
  quote.value = getRandomQuote()
  
  // 添加动画效果
  animateElements()
  
  // 确保WebSocket连接并监控状态
  websocketService.connect()
  checkConnection()
  connectionTimer = setInterval(checkConnection, 3000)
  
  // 加载内容统计数据
  loadContentStats()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (connectionTimer) {
    clearInterval(connectionTimer)
  }
})

// 动画效果
const animateElements = () => {
  setTimeout(() => {
    const elements = document.querySelectorAll('.animate-in')
    elements.forEach((el, index) => {
      setTimeout(() => {
        if(el) {
          el.classList.add('visible')
        }
      }, 150 * index)
    })
  }, 100)
}

// 更新时间和问候语
const updateTime = () => {
  const now = new Date()
  const hours = now.getHours()
  
  // 根据时间设置不同的问候语
  if (hours < 6) {
    greeting.value = '夜深了'
  } else if (hours < 9) {
    greeting.value = '早上好'
  } else if (hours < 12) {
    greeting.value = '上午好'
  } else if (hours < 14) {
    greeting.value = '中午好'
  } else if (hours < 18) {
    greeting.value = '下午好'
  } else if (hours < 22) {
    greeting.value = '晚上好'
  } else {
    greeting.value = '夜深了'
  }
  
  // 格式化时间
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  currentTime.value = now.toLocaleDateString('zh-CN', options)
}

// 检查WebSocket连接状态
const checkConnection = () => {
  isConnected.value = websocketService.connected
}

// 天气状态（仅展示用，实际项目中可以接入天气API）
const weather = reactive({
  type: '晴',
  temperature: '23°C',
  icon: '☀️'
})
</script>

<template>
  <div class="welcome-container">
    <div class="animated-bg">
      <div class="floating-circle c1"></div>
      <div class="floating-circle c2"></div>
      <div class="floating-circle c3"></div>
      <div class="floating-circle c4"></div>
      <div class="floating-circle c5"></div>
    </div>

    <div class="welcome-header animate-in">
      <div class="greeting-section">
        <h1>{{ greeting }}，{{ displayName }}！</h1>
        <div class="time-weather">
          <p class="time-display">{{ currentTime }}</p>
          <div class="weather-display">
            <span class="weather-icon">{{ weather.icon }}</span>
            <span>{{ weather.type }} {{ weather.temperature }}</span>
          </div>
        </div>
        <p class="welcome-message">欢迎回到 <span class="highlight">MediaMinds</span>，让灵感与知识在这里交汇</p>
      </div>
      
      <div class="quote-box">
        <div class="quote-content">
          <i class="quote-mark">❝</i>
          <p class="quote-text">{{ quote.text }}</p>
          <p class="quote-author">— {{ quote.author }}</p>
        </div>
      </div>
    </div>
    
    <div class="resource-stats animate-in">
      <div class="stat-item">
        <div class="stat-icon book-icon">📚</div>
        <div class="stat-number">
          <el-skeleton v-if="stats.loading" :rows="1" animated />
          <span v-else>{{ stats.books }}</span>
        </div>
        <div class="stat-label">图书资源</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon video-icon">🎬</div>
        <div class="stat-number">
          <el-skeleton v-if="stats.loading" :rows="1" animated />
          <span v-else>{{ stats.videos }}</span>
        </div>
        <div class="stat-label">视频资源</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon music-icon">🎵</div>
        <div class="stat-number">
          <el-skeleton v-if="stats.loading" :rows="1" animated />
          <span v-else>{{ stats.music }}</span>
        </div>
        <div class="stat-label">音乐资源</div>
      </div>
    </div>
    
    <div class="feature-cards">
      <el-row :gutter="24">
        <el-col :sm="24" :md="8">
          <el-card class="feature-card books-card animate-in" shadow="hover">
            <router-link to="/content/book">
              <div class="card-content">
                <div class="card-icon-circle">
                  <el-icon class="feature-icon"><Document /></el-icon>
                </div>
                <h2>知识宝库</h2>
                <p>沉浸文字的海洋，探索无尽的智慧与想象</p>
                <el-button type="primary" class="feature-btn">立即探索</el-button>
              </div>
            </router-link>
          </el-card>
        </el-col>
        
        <el-col :sm="24" :md="8">
          <el-card class="feature-card videos-card animate-in" shadow="hover">
            <router-link to="/content/video">
              <div class="card-content">
                <div class="card-icon-circle">
                  <el-icon class="feature-icon"><VideoCamera /></el-icon>
                </div>
                <h2>视觉盛宴</h2>
                <p>开启影像之旅，感受视觉的震撼与魅力</p>
                <el-button type="success" class="feature-btn">开始观看</el-button>
              </div>
            </router-link>
          </el-card>
        </el-col>
        
        <el-col :sm="24" :md="8">
          <el-card class="feature-card music-card animate-in" shadow="hover">
            <router-link to="/content/music">
              <div class="card-content">
                <div class="card-icon-circle">
                  <el-icon class="feature-icon"><Headset /></el-icon>
                </div>
                <h2>声音画廊</h2>
                <p>聆听灵魂的律动，体验音乐的无限可能</p>
                <el-button type="warning" class="feature-btn">开始聆听</el-button>
              </div>
            </router-link>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <div class="quick-access animate-in">
      <el-row :gutter="24">
        <el-col :sm="24" :md="16">
          <div class="card-wrapper">
            <el-card class="user-profile-card" shadow="hover">
              <div class="blurred-bg"></div>
              <div class="card-inner">
                <div class="card-header">
                  <div class="user-avatar">
                    <el-avatar :size="80" :src="userInfoStore.info.avatar || ''" class="glow-effect" />
                  </div>
                  <div class="card-title">
                    <h3>个人空间</h3>
                  </div>
                </div>
                <div class="card-content">
                  <p>在这里定制专属于你的内容世界，管理你的收藏与偏好</p>
                </div>
                <div class="card-footer">
                  <router-link to="/content/profile">
                    <el-button type="info" class="card-btn">前往个人空间</el-button>
                  </router-link>
                </div>
              </div>
            </el-card>
          </div>
        </el-col>
        
        <el-col :sm="24" :md="8">
          <div class="card-wrapper">
            <el-card class="notification-card" shadow="hover">
              <div class="card-inner">
                <div class="card-header">
                  <div class="card-title">
                    <h3>消息通知</h3>
                    <el-tag type="success" v-if="isConnected">已连接</el-tag>
                    <el-tag type="danger" v-else>未连接</el-tag>
                  </div>
                </div>
                <div class="card-content">
                  <p>实时接收系统通知与消息推送</p>
                </div>
                <div class="card-footer">
                  <el-button type="primary" @click="goToMessageCenter" class="card-btn">
                    进入消息中心
                  </el-button>
                </div>
              </div>
            </el-card>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped lang="scss">
// 动画背景
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4eaf1 100%);
  pointer-events: none; /* 确保背景不会干扰点击事件 */
}

.floating-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
  filter: blur(60px);
  animation-duration: 20s;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
  pointer-events: none; /* 确保动画元素不会干扰点击事件 */
}

.c1 {
  width: 350px;
  height: 350px;
  background: linear-gradient(45deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.6));
  top: 10%;
  left: 15%;
  animation-name: float1;
}

.c2 {
  width: 220px;
  height: 220px;
  background: linear-gradient(45deg, rgba(34, 211, 238, 0.4), rgba(59, 130, 246, 0.6));
  top: 60%;
  left: 30%;
  animation-name: float2;
}

.c3 {
  width: 280px;
  height: 280px;
  background: linear-gradient(45deg, rgba(249, 115, 22, 0.4), rgba(234, 88, 12, 0.6));
  top: 25%;
  right: 15%;
  animation-name: float3;
}

.c4 {
  width: 200px;
  height: 200px;
  background: linear-gradient(45deg, rgba(16, 185, 129, 0.4), rgba(5, 150, 105, 0.6));
  bottom: 15%;
  right: 20%;
  animation-name: float4;
}

.c5 {
  width: 230px;
  height: 230px;
  background: linear-gradient(45deg, rgba(219, 39, 119, 0.4), rgba(236, 72, 153, 0.6));
  top: 35%;
  left: 45%;
  animation-name: float5;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(60px, 40px) rotate(5deg); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-40px, 50px) rotate(-5deg); }
}
@keyframes float3 {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(50px, -50px) rotate(7deg); }
}
@keyframes float4 {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-40px, -40px) rotate(-7deg); }
}
@keyframes float5 {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-35px, 20px) rotate(-3deg); }
}

// 入场动画
.animate-in {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  &.visible {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-container {
  padding: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-header {
  margin-bottom: 50px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 30px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  
  h1 {
    font-size: 3rem;
    margin: 0;
    color: #1f2937;
    font-weight: 800;
    letter-spacing: -1px;
    background: linear-gradient(135deg, #1f2937, #4f46e5);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .time-weather {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    margin: 15px 0 25px;
  }
  
  .time-display {
    font-size: 1.2rem;
    color: #4b5563;
    margin: 0;
    font-weight: 500;
    padding: 8px 16px;
    background: rgba(229, 231, 235, 0.5);
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }
  
  .weather-display {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #4b5563;
    padding: 8px 20px;
    background: rgba(229, 231, 235, 0.5);
    border-radius: 12px;
    font-size: 1.2rem;
    font-weight: 500;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    
    .weather-icon {
      font-size: 1.8rem;
    }
  }
  
  .welcome-message {
    font-size: 1.5rem;
    color: #4b5563;
    line-height: 1.6;
    max-width: 800px;
    margin: 0;
    font-weight: 500;
  }
}

.quote-box {
  padding: 30px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(243, 244, 246, 0.8));
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
  
  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 6px;
    background: linear-gradient(to bottom, #4f46e5, #ec4899);
  }
  
  .quote-content {
    position: relative;
    padding-left: 20px;
  }
  
  .quote-text {
    font-size: 1.4rem;
    font-style: italic;
    color: #1f2937;
    margin: 0 0 15px 0;
    line-height: 1.7;
    font-weight: 500;
  }
  
  .quote-author {
    text-align: right;
    font-weight: 600;
    color: #4f46e5;
    margin: 0;
    font-size: 1.1rem;
  }
  
  .quote-mark {
    position: absolute;
    left: -15px;
    top: -35px;
    font-size: 6rem;
    color: rgba(79, 70, 229, 0.1);
  }
}

.resource-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 50px;
  
  .stat-item {
    text-align: center;
    padding: 30px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
    width: 30%;
    transition: all 0.4s ease;
    position: relative;
    overflow: hidden;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 5px;
      background: linear-gradient(to right, transparent, rgba(79, 70, 229, 0.5), transparent);
      transform: translateY(100%);
      transition: transform 0.3s ease;
    }
    
    &:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      
      &::after {
        transform: translateY(0);
      }
      
      .stat-icon {
        transform: scale(1.2);
      }
    }
    
    .stat-icon {
      font-size: 3.5rem;
      margin-bottom: 15px;
      transition: transform 0.4s ease;
    }
    
    .stat-number {
      font-size: 2.5rem;
      font-weight: 800;
      color: #1f2937;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #1f2937, #4f46e5);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .stat-label {
      color: #4b5563;
      font-size: 1.2rem;
      font-weight: 500;
    }
  }
  
  .book-icon { text-shadow: 0 0 15px rgba(79, 70, 229, 0.5); }
  .video-icon { text-shadow: 0 0 15px rgba(16, 185, 129, 0.5); }
  .music-icon { text-shadow: 0 0 15px rgba(245, 158, 11, 0.5); }
}

.feature-cards {
  margin-bottom: 50px;
  
  .feature-card {
    height: 100%;
    transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    overflow: hidden;
    border: none;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.5);
    
    &:hover {
      transform: translateY(-12px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      
      .feature-icon {
        transform: scale(1.15) rotate(8deg);
      }
      
      .card-icon-circle {
        box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.2);
      }
      
      .feature-btn {
        transform: scale(1.05);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
      }
    }
    
    a {
      text-decoration: none;
      color: inherit;
      display: block;
      width: 100%;
      height: 100%;
    }
    
    .card-content {
      padding: 40px 30px;
      text-align: center;
      position: relative;
      z-index: 1;
      
      h2 {
        margin: 25px 0 15px;
        font-size: 1.8rem;
        font-weight: 700;
        background: linear-gradient(to right, #1f2937, #4f46e5);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      
      p {
        color: #4b5563;
        margin-bottom: 30px;
        height: 50px;
        line-height: 1.6;
        font-size: 1.1rem;
      }
    }
    
    .feature-btn {
      padding: 12px 28px;
      font-weight: 600;
      border-radius: 30px;
      transition: all 0.4s ease;
      border: none;
      position: relative;
      z-index: 2;
      font-size: 1.1rem;
      
      &:hover {
        transform: scale(1.05);
      }
    }
    
    .card-icon-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      transition: all 0.5s ease;
    }
    
    .feature-icon {
      font-size: 45px;
      transition: all 0.5s ease;
    }
  }
  
  .books-card {
    .card-icon-circle {
      background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
    }
    .feature-icon {
      color: #3b82f6;
    }
  }
  
  .videos-card {
    .card-icon-circle {
      background: linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%);
    }
    .feature-icon {
      color: #10b981;
    }
  }
  
  .music-card {
    .card-icon-circle {
      background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
    }
    .feature-icon {
      color: #f59e0b;
    }
  }
}

.quick-access {
  .card-wrapper {
    height: 280px;
    position: relative;
    margin-bottom: 30px;
  }
  
  .user-profile-card, .notification-card {
    height: 100%;
    border-radius: 16px;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
    border: none;
    overflow: hidden;
    
    .card-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 40px;
      position: relative;
      z-index: 1;
    }
    
    .card-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      
      .card-title {
        h3 {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          color: white;
        }
      }
    }
    
    .card-content {
      flex: 1;
      
      p {
        color: rgba(255, 255, 255, 0.9);
        font-size: 1.2rem;
        line-height: 1.8;
        margin: 0;
      }
    }
    
    .card-footer {
      padding-top: 30px;
      
      .card-btn {
        padding: 14px 30px;
        font-weight: 600;
        font-size: 1.1rem;
        border-radius: 30px;
        background: white;
        border: none;
        transition: all 0.3s ease;
        
        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }
      }
    }
  }
  
  .user-profile-card {
    background: transparent;
    
    .blurred-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(79, 70, 229, 0.9));
      z-index: 0;
      border-radius: 16px;
    }
    
    .user-avatar {
      margin-right: 20px;
      
      .glow-effect {
        box-shadow: 0 0 25px rgba(255, 255, 255, 0.6);
        border: 4px solid white;
      }
    }
    
    .card-btn {
      color: #7c3aed;
      
      &:hover {
        background: rgba(255, 255, 255, 0.9);
      }
    }
  }
  
  .notification-card {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    color: white;
    
    .card-header {
      .card-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
    }
    
    .card-btn {
      color: #3b82f6;
      
      &:hover {
        background: rgba(255, 255, 255, 0.9);
      }
    }
  }
}

// 针对小屏幕的响应式调整
@media (max-width: 768px) {
  .welcome-header {
    h1 {
      font-size: 2.2rem;
    }
    
    .welcome-message {
      font-size: 1.2rem;
    }
  }
  
  .resource-stats {
    flex-direction: column;
    gap: 20px;
    
    .stat-item {
      width: 100%;
    }
  }
  
  .feature-cards {
    .el-col {
      margin-bottom: 25px;
    }
  }
  
  .quick-access {
    .card-wrapper {
      height: auto;
      min-height: 220px;
    }
    
    .user-profile-card {
      .card-header {
        flex-direction: column;
        text-align: center;
        
        .user-avatar {
          margin-right: 0;
          margin-bottom: 15px;
        }
      }
    }
    
    .card-footer {
      text-align: center;
    }
  }
}

.highlight {
  background: linear-gradient(135deg, #4f46e5, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
}
</style> 