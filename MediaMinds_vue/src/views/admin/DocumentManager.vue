<template>
  <div class="document-manager-admin">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="文档管理" name="documents">
        <div class="search-bar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索文档"
            prefix-icon="Search"
            @keyup.enter="handleSearch"
            clearable
            @clear="resetSearch"
            style="width: 300px;"
          />
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </div>
        
        <el-table
          v-loading="loading"
          :data="documentList"
          stripe
          border
          style="width: 100%; margin-top: 20px;"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="title" label="文档名称" min-width="150">
            <template #default="scope">
              <div class="document-title">
                <el-icon><Document /></el-icon>
                <span @click="viewDocument(scope.row)" class="document-name">{{ scope.row.title }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="fileType" label="类型" width="100" />
          <el-table-column prop="fileSize" label="大小" width="100">
            <template #default="scope">
              {{ formatFileSize(scope.row.fileSize) }}
            </template>
          </el-table-column>
          <el-table-column prop="userId" label="用户ID" width="120" />
          <el-table-column prop="version" label="版本" width="80" />
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-button-group>
                <el-button size="small" type="primary" @click="viewDocument(scope.row)">
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button size="small" type="primary" @click="viewVersions(scope.row)">
                  <el-icon><List /></el-icon>
                </el-button>
                <el-button size="small" type="danger" @click="deleteDocument(scope.row)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="文件夹管理" name="folders">
        <div class="folder-management">
          <el-tree
            :data="folderTree"
            :props="defaultProps"
            node-key="id"
            default-expand-all
          >
            <template #default="{ node, data }">
              <div class="custom-tree-node">
                <span>
                  <el-icon><Folder /></el-icon>
                  {{ node.label }}
                </span>
                <span>
                  <el-button
                    type="text"
                    size="small"
                    @click="() => handleFolderDelete(data)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </span>
              </div>
            </template>
          </el-tree>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="统计信息" name="stats">
        <div class="stats-container">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <span>文档总数</span>
                  </div>
                </template>
                <div class="stat-value">{{ stats.totalDocuments }}</div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <span>文件夹总数</span>
                  </div>
                </template>
                <div class="stat-value">{{ stats.totalFolders }}</div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <div class="card-header">
                    <span>总存储空间</span>
                  </div>
                </template>
                <div class="stat-value">{{ formatFileSize(stats.totalStorage) }}</div>
              </el-card>
            </el-col>
          </el-row>
          
          <div class="chart-container" style="margin-top: 30px;">
            <h3>文档类型分布</h3>
            <div id="fileTypeChart" style="width: 100%; height: 400px;"></div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 文档详情对话框 -->
    <el-dialog
      v-model="documentDetailDialog"
      title="文档详情"
      width="70%"
      top="5vh"
      :append-to-body="true"
      :destroy-on-close="true"
      class="document-preview-dialog"
    >
      <template v-if="currentDocument">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentDocument.id }}</el-descriptions-item>
          <el-descriptions-item label="标题">{{ currentDocument.title }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ currentDocument.userId }}</el-descriptions-item>
          <el-descriptions-item label="文件夹ID">{{ currentDocument.folderId || '根目录' }}</el-descriptions-item>
          <el-descriptions-item label="文件类型">{{ currentDocument.fileType }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(currentDocument.fileSize) }}</el-descriptions-item>
          <el-descriptions-item label="当前版本">{{ currentDocument.version }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(currentDocument.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(currentDocument.updatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentDocument.description || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="document-preview" style="margin-top: 20px;">
          <h3>文档预览</h3>
          <!-- Office文档预览 -->
          <iframe v-if="currentDocument && getPreviewUrl(currentDocument)"
            :src="getPreviewUrl(currentDocument)" 
            width="100%" height="500" frameborder="0"></iframe>
          
          <!-- 图片预览 -->
          <div v-else-if="currentDocument && isImageFile(currentDocument)" class="image-preview">
            <img :src="currentDocument.ossUrl" alt="文档预览" style="max-width: 100%; max-height: 500px;" />
          </div>
          
          <!-- 不支持的格式 -->
          <el-empty v-else description="无法在线预览此文件类型">
            <el-button type="primary" @click="window.open(currentDocument.ossUrl)">下载文件</el-button>
          </el-empty>
        </div>
      </template>
    </el-dialog>
    
    <!-- 版本历史对话框 -->
    <el-dialog
      v-model="versionHistoryDialog"
      title="版本历史"
      width="70%"
      top="10vh"
      :append-to-body="true"
      :destroy-on-close="true"
      class="document-version-dialog"
    >
      <template v-if="documentVersions.length > 0">
        <el-table :data="documentVersions" border style="width: 100%">
          <el-table-column prop="versionNumber" label="版本" width="80" />
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="fileSize" label="大小" width="120">
            <template #default="scope">
              {{ formatFileSize(scope.row.fileSize) }}
            </template>
          </el-table-column>
          <el-table-column prop="modifiedBy" label="修改者" width="120" />
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button size="small" type="primary" @click="downloadVersion(scope.row)">下载</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <el-empty v-else description="暂无版本历史" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Folder, View, Delete, Search, List } from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  getDocumentListService,
  getDocumentByIdService,
  deleteDocumentService,
  getDocumentVersionsService,
  searchDocumentsService,
  getFolderListService,
  deleteFolderService
} from '@/api/document.js'

// 注册echarts组件
echarts.use([PieChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer])

// 变量定义
const activeTab = ref('documents')
const documentList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchKeyword = ref('')
const loading = ref(false)
const isSearchMode = ref(false)
const folderTree = ref([])
const stats = reactive({
  totalDocuments: 0,
  totalFolders: 0,
  totalStorage: 0
})

// 对话框控制
const documentDetailDialog = ref(false)
const versionHistoryDialog = ref(false)

// 当前选中的文档和版本列表
const currentDocument = ref(null)
const documentVersions = ref([])

// 树形结构配置
const defaultProps = {
  children: 'children',
  label: 'name'
}

// 初始化
onMounted(() => {
  loadDocumentList()
  loadFolderTree()
  loadStats()
})

// 监听标签页切换
watch(activeTab, (newVal) => {
  if (newVal === 'folders') {
    loadFolderTree()
  } else if (newVal === 'stats') {
    loadStats()
    nextTick(() => {
      initFileTypeChart()
    })
  }
})

// 加载文档列表
const loadDocumentList = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      size: pageSize.value
    }
    
    const res = await getDocumentListService(params)
    if (res.code === 200) {
      documentList.value = res.data.records
      total.value = res.data.total
    }
  } catch (error) {
    console.error('加载文档失败:', error)
    ElMessage.error('加载文档失败')
  } finally {
    loading.value = false
  }
}

// 加载文件夹树
const loadFolderTree = async () => {
  try {
    const res = await getFolderListService()
    if (res.code === 200) {
      // 构建树形结构
      const buildTree = (items, parentId = null) => {
        const result = []
        const filtered = items.filter(item => item.parentId === parentId)
        
        filtered.forEach(item => {
          const children = buildTree(items, item.id)
          if (children.length) {
            item.children = children
          }
          result.push(item)
        })
        
        return result
      }

      folderTree.value = buildTree(res.data)
    }
  } catch (error) {
    console.error('加载文件夹失败:', error)
    ElMessage.error('加载文件夹失败')
  }
}

// 加载统计信息
const loadStats = async () => {
  try {
    // 这里假设后端提供了统计接口，实际中可能需要自行计算
    // 模拟数据
    stats.totalDocuments = total.value
    stats.totalFolders = folderTree.value.length
    
    // 计算总存储空间
    let totalSize = 0
    documentList.value.forEach(doc => {
      totalSize += doc.fileSize || 0
    })
    stats.totalStorage = totalSize
  } catch (error) {
    console.error('加载统计信息失败:', error)
    ElMessage.error('加载统计信息失败')
  }
}

// 初始化文件类型分布图表
const initFileTypeChart = () => {
  // 统计文件类型分布
  const typeCount = {}
  documentList.value.forEach(doc => {
    if (doc.fileType) {
      typeCount[doc.fileType] = (typeCount[doc.fileType] || 0) + 1
    }
  })
  
  const chartData = Object.keys(typeCount).map(type => ({
    name: type,
    value: typeCount[type]
  }))
  
  const chartDom = document.getElementById('fileTypeChart')
  if (!chartDom) return
  
  const chart = echarts.init(chartDom)
  const option = {
    title: {
      text: '文档类型分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '文件类型',
        type: 'pie',
        radius: '60%',
        data: chartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  chart.setOption(option)
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

// 搜索文档
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    await loadDocumentList()
    return
  }
  
  isSearchMode.value = true
  loading.value = true
  try {
    const res = await searchDocumentsService({
      page: currentPage.value,
      size: pageSize.value,
      keyword: searchKeyword.value
    })
    
    if (res.code === 200) {
      documentList.value = res.data.records
      total.value = res.data.total
    }
  } catch (error) {
    console.error('搜索文档失败:', error)
    ElMessage.error('搜索文档失败')
  } finally {
    loading.value = false
  }
}

// 重置搜索
const resetSearch = async () => {
  searchKeyword.value = ''
  isSearchMode.value = false
  await loadDocumentList()
}

// 分页处理
const handleSizeChange = async (val) => {
  pageSize.value = val
  if (isSearchMode.value) {
    await handleSearch()
  } else {
    await loadDocumentList()
  }
}

const handleCurrentChange = async (val) => {
  currentPage.value = val
  if (isSearchMode.value) {
    await handleSearch()
  } else {
    await loadDocumentList()
  }
}

// 查看文档详情
const viewDocument = async (document) => {
  try {
    const res = await getDocumentByIdService(document.id)
    if (res.code === 200) {
      currentDocument.value = res.data
      documentDetailDialog.value = true
    }
  } catch (error) {
    console.error('获取文档详情失败:', error)
    ElMessage.error('获取文档详情失败')
  }
}

// 获取文档预览URL
const getPreviewUrl = (document) => {
  if (!document || !document.ossUrl) return '';
  
  // 判断文档类型
  const fileType = document.fileType?.toLowerCase();
  
  // Office文档使用Office Online Viewer
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileType)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.ossUrl)}`;
  }
  
  // PDF文档直接嵌入
  if (fileType === 'pdf') {
    return document.ossUrl;
  }
  
  // 图片文件直接嵌入
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileType)) {
    return document.ossUrl;
  }
  
  // 其他文件类型无法直接预览
  return '';
};

// 判断是否可以使用图片预览器
const isImageFile = (document) => {
  if (!document || !document.fileType) return false;
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(document.fileType.toLowerCase());
};

// 查看版本历史
const viewVersions = async (document) => {
  try {
    const res = await getDocumentVersionsService(document.id)
    if (res.code === 200) {
      documentVersions.value = res.data
      versionHistoryDialog.value = true
    }
  } catch (error) {
    console.error('获取版本历史失败:', error)
    ElMessage.error('获取版本历史失败')
  }
}

// 下载版本
const downloadVersion = (version) => {
  if (version.ossUrl) {
    window.open(version.ossUrl)
  } else {
    ElMessage.warning('版本下载地址不可用')
  }
}

// 删除文档
const deleteDocument = (document) => {
  ElMessageBox.confirm('确定要删除该文档吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteDocumentService(document.id)
      if (res.code === 200) {
        ElMessage.success('删除文档成功')
        await loadDocumentList()
        loadStats()
      }
    } catch (error) {
      console.error('删除文档失败:', error)
      ElMessage.error('删除文档失败')
    }
  }).catch(() => {})
}

// 删除文件夹
const handleFolderDelete = (folder) => {
  ElMessageBox.confirm('确定要删除该文件夹吗？其中的文档将不会被删除。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteFolderService(folder.id)
      if (res.code === 200) {
        ElMessage.success('删除文件夹成功')
        await loadFolderTree()
        loadStats()
      }
    } catch (error) {
      console.error('删除文件夹失败:', error)
      ElMessage.error('删除文件夹失败')
    }
  }).catch(() => {})
}

// 工具函数
const formatFileSize = (size) => {
  if (!size) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index++
  }
  
  return `${size.toFixed(2)} ${units[index]}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.document-manager-admin {
  padding: 20px;
  height: calc(100vh - 120px);
  overflow: auto;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.custom-tree-node {
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
}

.document-title {
  display: flex;
  align-items: center;
  gap: 5px;
}

.document-name {
  color: #409eff;
  cursor: pointer;
}

.document-name:hover {
  text-decoration: underline;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.stats-container {
  padding: 20px 0;
  overflow-y: auto;
  max-height: calc(100vh - 180px);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  text-align: center;
}

.chart-container {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.image-preview {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.document-preview {
  margin-bottom: 20px;
}

/* 对话框样式 */
.document-preview-dialog,
.document-version-dialog {
  margin: 0 auto 0 100px; /* 为左侧导航栏留出空间 */
}

/* 设置全局样式 */
:deep(.el-dialog) {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  margin: 0 auto 0 100px !important; /* 重要：强制设置右偏移 */
}

:deep(.el-dialog .el-dialog__body) {
  overflow: auto;
  flex: 1;
}
</style>