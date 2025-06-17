<script setup>
import { ref, onMounted, nextTick } from 'vue'
import useUserInfoStore from '@/stores/userInfo.js'
import { ElMessage } from 'element-plus'
import { getDashboardStatsService, getContentCategoryService, getUserGrowthService } from '@/api/admin.js'
import * as echarts from 'echarts/core'
import { PieChart, LineChart, BarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, TitleComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 注册必要的组件
echarts.use([PieChart, LineChart, BarChart, TooltipComponent, LegendComponent, TitleComponent, GridComponent, CanvasRenderer])

const userInfoStore = useUserInfoStore()
const userInfo = ref(userInfoStore.info)

// 统计数据
const stats = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalContent: 0,
  newContents: 0
})

// 内容详情
const contentDetails = ref({
  songs: 0,
  movies: 0,
  books: 0
})

// 加载状态
const loading = ref(false)
const chartLoading = ref(false)
const lineChartLoading = ref(false)

// 图表实例
let pieChart = null
let lineChart = null

// 加载仪表盘数据
const loadDashboardData = async () => {
  loading.value = true
  try {
    const result = await getDashboardStatsService()
    stats.value.totalUsers = result.totalUsers
    stats.value.activeUsers = result.activeUsers
    stats.value.totalContent = result.totalContent
    contentDetails.value = result.contentDetails
    
    // 假设新增内容是总内容的5%
    stats.value.newContents = Math.round(result.totalContent * 0.05)
  } catch (error) {
    console.error('加载仪表盘数据失败', error)
    ElMessage.error('加载仪表盘数据失败')
  } finally {
    loading.value = false
  }
}

// 加载内容分类统计数据并绘制饼图
const loadContentCategoryChart = async () => {
  chartLoading.value = true
  try {
    const result = await getContentCategoryService()
    
    // 计算总数
    const total = result.songs + result.movies + result.books
    
    // 准备饼图数据
    const pieData = [
      { value: result.songs, name: '音乐', percentage: ((result.songs / total) * 100).toFixed(1) + '%' },
      { value: result.movies, name: '视频', percentage: ((result.movies / total) * 100).toFixed(1) + '%' },
      { value: result.books, name: '图书', percentage: ((result.books / total) * 100).toFixed(1) + '%' }
    ]
    
    nextTick(() => {
      initPieChart(pieData)
    })
  } catch (error) {
    console.error('加载内容分类统计数据失败', error)
    ElMessage.error('加载内容分类统计数据失败')
  } finally {
    chartLoading.value = false
  }
}

// 初始化饼图
const initPieChart = (data) => {
  // 获取DOM元素
  const chartDom = document.getElementById('content-category-chart')
  if (!chartDom) return
  
  // 销毁旧图表
  if (pieChart) {
    pieChart.dispose()
  }
  
  // 初始化图表
  pieChart = echarts.init(chartDom)
  
  // 配置选项
  const option = {
    title: {
      text: '内容分布统计',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 'bottom',
      data: data.map(item => item.name)
    },
    series: [
      {
        name: '内容分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {c} ({d}%)'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '16',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: true
        },
        data: data
      }
    ],
    color: ['#409EFF', '#E6A23C', '#67C23A']
  }
  
  // 设置选项并渲染图表
  pieChart.setOption(option)
  
  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    pieChart && pieChart.resize()
  })
}

// 加载用户增长趋势数据并绘制折线图
const loadUserGrowthChart = async () => {
  lineChartLoading.value = true
  try {
    const result = await getUserGrowthService()
    
    if (result.code === 200 && result.data && result.data.list) {
      // 按月份分组用户数据
      const usersByMonth = processUserGrowthData(result.data.list)
      
      nextTick(() => {
        initLineChart(usersByMonth)
      })
    } else {
      ElMessage.error('获取用户增长数据失败')
    }
  } catch (error) {
    console.error('加载用户增长趋势数据失败', error)
    ElMessage.error('加载用户增长趋势数据失败')
  } finally {
    lineChartLoading.value = false
  }
}

// 处理用户增长数据
const processUserGrowthData = (users) => {
  // 获取当前日期
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() // 0-11
  const currentYear = currentDate.getFullYear()
  
  // 创建过去12个月的月份标签
  const months = []
  const usersByMonth = Array(12).fill(0)
  
  // 生成过去12个月的月份标签（包括当前月）
  for (let i = 0; i < 12; i++) {
    // 计算月份和年份
    // i=0 是11个月前，i=11 是当前月
    let monthIndex = (currentMonth - 11 + i + 12) % 12 // 确保月份索引在0-11之间
    let yearOffset = Math.floor((currentMonth - 11 + i) / 12) // 计算年份偏移
    let year = currentYear + yearOffset
    
    // 月份名称格式：'YYYY年M月'
    const monthName = `${year}年${monthIndex + 1}月`
    months[i] = monthName
  }
  
  // 计算12个月之前的用户总数（作为基数）
  let initialUserCount = 0
  
  // 对用户按注册月份进行分组计数
  users.forEach(user => {
    if (user.createdAt) {
      const date = new Date(user.createdAt)
      const userMonth = date.getMonth()
      const userYear = date.getFullYear()
      
      // 计算该用户注册时间与当前时间的月份差
      const monthDiff = (currentYear - userYear) * 12 + (currentMonth - userMonth)
      
      if (monthDiff >= 12) {
        // 12个月前注册的用户计入初始用户数
        initialUserCount++;
      } else if (monthDiff >= 0 && monthDiff < 12) {
        // 过去12个月内的用户（包括当前月）
        // monthDiff=0 是当前月，应该对应索引11
        // monthDiff=11 是11个月前，应该对应索引0
        usersByMonth[11 - monthDiff]++
      }
    }
  })
  
  // 计算累计用户数（包含初始用户数）
  const cumulativeUsers = []
  let total = initialUserCount // 从初始用户数开始累加
  
  for (let i = 0; i < usersByMonth.length; i++) {
    total += usersByMonth[i]
    cumulativeUsers.push(total)
  }
  
  console.log('初始用户数:', initialUserCount)
  console.log('月份标签:', months)
  console.log('月度新增用户:', usersByMonth)
  console.log('累计用户数:', cumulativeUsers)
  
  return {
    months,
    newUsers: usersByMonth,
    cumulativeUsers
  }
}

// 初始化折线图
const initLineChart = (data) => {
  // 获取DOM元素
  const chartDom = document.getElementById('user-growth-chart')
  if (!chartDom) return
  
  // 销毁旧图表
  if (lineChart) {
    lineChart.dispose()
  }
  
  // 初始化图表
  lineChart = echarts.init(chartDom)
  
  // 配置选项
  const option = {
    title: {
      text: '用户增长趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line'
      }
    },
    legend: {
      data: ['月度新增用户', '累计用户数'],
      bottom: 'bottom'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.months
    },
    yAxis: {
      type: 'value',
      name: '用户数',
      minInterval: 1
    },
    series: [
      {
        name: '月度新增用户',
        type: 'line',
        data: data.newUsers,
        color: '#409EFF',
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 2
        }
      },
      {
        name: '累计用户数',
        type: 'line',
        data: data.cumulativeUsers,
        color: '#67C23A',
        smooth: true,
        symbol: 'emptyCircle',
        symbolSize: 8,
        lineStyle: {
          width: 3
        },
        areaStyle: {
          opacity: 0.1
        }
      }
    ]
  }
  
  // 设置选项并渲染图表
  lineChart.setOption(option)
}

// 窗口大小变化时重新调整图表大小
window.addEventListener('resize', () => {
  pieChart && pieChart.resize()
  lineChart && lineChart.resize()
})

onMounted(() => {
  loadDashboardData()
  loadContentCategoryChart()
  loadUserGrowthChart()
})
</script>

<template>
  <div class="admin-dashboard">
    <div class="welcome-section">
      <h1 class="welcome-title">欢迎回来，{{ userInfo.nickName || '管理员' }}</h1>
      <p class="welcome-subtitle">这里是系统概览</p>
    </div>

    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover" class="stats-card users-card" v-loading="loading">
            <div class="stats-icon">
              <el-icon><el-icon-user /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ stats.totalUsers }}</div>
              <div class="stats-label">总用户数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover" class="stats-card active-card" v-loading="loading">
            <div class="stats-icon">
              <el-icon><el-icon-data-line /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ stats.activeUsers }}</div>
              <div class="stats-label">活跃用户</div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover" class="stats-card content-card" v-loading="loading">
            <div class="stats-icon">
              <el-icon><el-icon-document /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ stats.totalContent }}</div>
              <div class="stats-label">内容总数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover" class="stats-card new-card" v-loading="loading">
            <div class="stats-icon">
              <el-icon><el-icon-plus /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ stats.newContents }}</div>
              <div class="stats-label">本周新增</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="content-breakdown">
      <el-card shadow="hover" v-loading="loading">
        <template #header>
          <div class="content-header">
            <span>内容明细</span>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="content-item music-item">
              <div class="content-icon">
                <el-icon><el-icon-headset /></el-icon>
              </div>
              <div class="content-info">
                <div class="content-value">{{ contentDetails.songs }}</div>
                <div class="content-label">音乐资源</div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="content-item video-item">
              <div class="content-icon">
                <el-icon><el-icon-video-camera /></el-icon>
              </div>
              <div class="content-info">
                <div class="content-value">{{ contentDetails.movies }}</div>
                <div class="content-label">视频资源</div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="content-item book-item">
              <div class="content-icon">
                <el-icon><el-icon-reading /></el-icon>
              </div>
              <div class="content-info">
                <div class="content-value">{{ contentDetails.books }}</div>
                <div class="content-label">图书资源</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <div class="charts-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card" v-loading="lineChartLoading">
            <template #header>
              <div class="chart-header">
                <span>用户增长趋势</span>
                <el-dropdown>
                  <el-button type="text">
                    操作<el-icon class="el-icon--right"><el-icon-arrow-down /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item>导出数据</el-dropdown-item>
                      <el-dropdown-item @click="loadUserGrowthChart">刷新</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
            <div id="user-growth-chart" class="chart-container"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card" v-loading="chartLoading">
            <template #header>
              <div class="chart-header">
                <span>内容分类统计</span>
                <el-dropdown>
                  <el-button type="text">
                    操作<el-icon class="el-icon--right"><el-icon-arrow-down /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item>导出数据</el-dropdown-item>
                      <el-dropdown-item @click="loadContentCategoryChart">刷新</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
            <div id="content-category-chart" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-dashboard {
  padding: 20px;
}

.welcome-section {
  margin-bottom: 30px;
}

.welcome-title {
  font-size: 28px;
  margin-bottom: 8px;
  color: #333;
}

.welcome-subtitle {
  font-size: 16px;
  color: #888;
}

.stats-cards {
  margin-bottom: 30px;
}

.stats-card {
  height: 120px;
  display: flex;
  align-items: center;
  padding: 20px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
}

.stats-icon {
  font-size: 48px;
  margin-right: 20px;
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stats-label {
  font-size: 14px;
  color: #666;
}

.users-card .stats-icon {
  color: #409EFF;
}

.active-card .stats-icon {
  color: #67C23A;
}

.content-card .stats-icon {
  color: #E6A23C;
}

.new-card .stats-icon {
  color: #F56C6C;
}

.content-breakdown {
  margin-bottom: 30px;
}

.content-item {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  }
}

.content-icon {
  font-size: 36px;
  margin-right: 20px;
}

.content-info {
  flex: 1;
}

.content-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.content-label {
  font-size: 14px;
  color: #666;
}

.music-item .content-icon {
  color: #409EFF;
}

.video-item .content-icon {
  color: #E6A23C;
}

.book-item .content-icon {
  color: #67C23A;
}

.charts-section {
  margin-bottom: 30px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 400px;
  width: 100%;
}
</style> 