<template>
  <div class="comment-management">
    <div class="page-header">
      <h2>评论管理</h2>
      <p class="sub-title">管理所有用户评论</p>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <span>评论搜索</span>
        </div>
      </template>
      
      <el-form :model="queryParams" inline>
        <el-form-item label="评论类型">
          <el-select v-model="queryParams.type" placeholder="评论类型" clearable>
            <el-option label="歌曲评论" value="0"></el-option>
            <el-option label="歌单评论" value="1"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="歌曲/歌单ID">
          <el-input v-model="queryParams.contentId" placeholder="歌曲ID或歌单ID" clearable></el-input>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="queryParams.userName" placeholder="评论用户名" clearable></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery" icon="Search">查询</el-button>
          <el-button @click="resetQuery" icon="RefreshRight">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 评论列表 -->
    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>评论列表</span>
        </div>
      </template>

      <el-table 
        :data="comments" 
        style="width: 100%" 
        border 
        stripe 
        v-loading="loading"
        height="550">
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column type="index" width="50" label="序号"></el-table-column>
        <el-table-column prop="userId" label="用户ID" width="80"></el-table-column>
        <el-table-column label="评论类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 0 || row.type === '0' ? 'primary' : 'success'">
              {{ (row.type === 0 || row.type === '0') ? '歌曲评论' : '歌单评论' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="评论对象" width="180">
          <template #default="{ row }">
            <div class="comment-target">
              <span v-if="row.type === 0 || row.type === '0'">
                <el-tooltip :content="getSongName(row.songId)" placement="top">
                  <span class="target-name">{{ getSongName(row.songId) }}</span>
                </el-tooltip>
              </span>
              <span v-else>
                <el-tooltip :content="getSongListTitle(row.songListId)" placement="top">
                  <span class="target-name">{{ getSongListTitle(row.songListId) }}</span>
                </el-tooltip>
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="评论内容" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="comment-content-preview">
              {{ formatCommentContent(row.content) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="评论时间" width="150" sortable>
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="up" label="点赞数" width="80" sortable>
          <template #default="{ row }">
            <span class="likes-count">
              <el-icon><el-icon-thumbs-up /></el-icon>
              {{ row.up || 0 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="operation-buttons-row">
              <el-button type="primary" size="small" @click="handleView(row)" icon="View">查看</el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)" icon="Delete">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <admin-pagination
          v-model="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          @change="handlePaginationChange"
        />
      </div>
    </el-card>

    <!-- 评论详情对话框 -->
    <el-dialog title="评论详情" v-model="detailDialogVisible" width="600px">
      <div v-if="currentComment" class="comment-detail">
        <div class="comment-header">
          <div class="comment-meta">
            <h3 class="user-name">{{ currentComment.userName || currentComment.userId}}</h3>
            <div class="comment-time">{{ formatTime(currentComment.createTime) }}</div>
          </div>
        </div>
        
        <div class="comment-info">
          <div class="info-item">
            <span class="label">评论类型：</span>
            <el-tag :type="currentComment.type === 0 || currentComment.type === '0' ? 'primary' : 'success'">
              {{ (currentComment.type === 0 || currentComment.type === '0') ? '歌曲评论' : '歌单评论' }}
            </el-tag>
          </div>
          <div class="info-item">
            <span class="label">评论对象：</span>
            <span v-if="currentComment.type === 0 || currentComment.type === '0'">
              <el-tag type="info">{{ getSongName(currentComment.songId) }}</el-tag>
            </span>
            <span v-else>
              <el-tag type="info">{{ getSongListTitle(currentComment.songListId) }}</el-tag>
            </span>
          </div>
          <div class="info-item">
            <span class="label">点赞数：</span>
            <span class="likes">
              <el-icon><el-icon-thumbs-up /></el-icon>
              {{ currentComment.up || 0 }}
            </span>
          </div>
        </div>
        
        <div class="comment-content">
          <p class="label">评论内容：</p>
          <div class="content-box">
            {{ formatContentWithLineBreaks(currentComment.content) }}
          </div>
        </div>
        
        <div class="comment-actions">
          <el-button type="primary" icon="Edit" @click="handleLike" :disabled="isLikeDisabled">
            {{ isLikeDisabled ? '已点赞' : '点赞' }}
          </el-button>
          <el-button type="danger" icon="Delete" @click="handleDeleteFromDetail">删除评论</el-button>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminPagination from '@/components/AdminPagination.vue'
import { 
  getCommentsService, 
  getCommentByIdService, 
  deleteCommentService,
  likeCommentService,
  getAllSongsService,
  getAllSongListsService
} from '@/api/music.js'

// 评论列表
const comments = ref([])
// 歌曲和歌单数据
const songs = ref([])
const songLists = ref([])
// 加载状态
const loading = ref(false)

// 查询参数
const queryParams = reactive({
  type: '',
  contentId: '',
  userName: ''
})

// 分页参数
const pagination = reactive({
  currentPage: 1,
  pageSize: 6,
  total: 0
})

// 对话框状态
const detailDialogVisible = ref(false)

// 当前评论
const currentComment = ref(null)

// 当前评论点赞状态
const isLikeDisabled = ref(false)

// 获取所有评论
const fetchComments = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = {
      pageNum: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    // 根据筛选条件添加参数
    if (queryParams.type) {
      params.type = queryParams.type
    }
    
    if (queryParams.contentId) {
      if (queryParams.type === '0') {
        params.songId = queryParams.contentId
      } else if (queryParams.type === '1') {
        params.songListId = queryParams.contentId
      } else {
        // 如果没有指定类型但有ID，可以作为通用ID查询
        params.id = queryParams.contentId
      }
    }
    
    if (queryParams.userName) {
      params.userName = queryParams.userName
    }
    
    console.log('评论查询参数:', params)
    const res = await getCommentsService(params)
    if (res.code === 200) {
      comments.value = res.data.records || []
      pagination.total = res.data.total || 0
    } else {
      comments.value = []
      pagination.total = 0
      ElMessage.error(res.message || '获取评论列表失败')
    }
  } catch (error) {
    console.error('获取评论失败:', error)
    comments.value = []
    pagination.total = 0
    ElMessage.error('获取评论列表失败')
  } finally {
    loading.value = false
  }
}

// 获取所有歌曲
const fetchSongs = async () => {
  try {
    const params = {
      pageNum: 1,
      pageSize: 1000 // 获取更多歌曲，以便显示歌曲名称
    }
    const res = await getAllSongsService(params)
    if (res.code === 200) {
      if (res.data && res.data.records) {
        songs.value = res.data.records || []
      } else if (Array.isArray(res.data)) {
        songs.value = res.data
      } else {
        songs.value = []
        console.warn('获取歌曲数据格式不正确:', res.data)
      }
    } else {
      songs.value = []
      console.error('获取歌曲失败:', res.message)
    }
  } catch (error) {
    console.error('获取歌曲失败', error)
    songs.value = []
  }
}

// 获取所有歌单
const fetchSongLists = async () => {
  try {
    const params = {
      pageNum: 1,
      pageSize: 1000 // 获取更多歌单，以便显示歌单标题
    }
    const res = await getAllSongListsService(params)
    if (res.code === 200) {
      if (res.data && res.data.records) {
        songLists.value = res.data.records || []
      } else if (Array.isArray(res.data)) {
        songLists.value = res.data
      } else {
        songLists.value = []
        console.warn('获取歌单数据格式不正确:', res.data)
      }
    } else {
      songLists.value = []
      console.error('获取歌单失败:', res.message)
    }
  } catch (error) {
    console.error('获取歌单失败', error)
    songLists.value = []
  }
}

// 根据条件筛选评论
const handleQuery = () => {
  // 先验证ID输入是否合法
  if (queryParams.contentId && !/^\d+$/.test(queryParams.contentId)) {
    ElMessage.warning('请输入有效的ID数字')
    return
  }
  
  pagination.currentPage = 1
  fetchComments()
}

// 重置查询
const resetQuery = () => {
  queryParams.type = ''
  queryParams.contentId = ''
  queryParams.userName = ''
  
  // 在重置后查询所有数据
  pagination.currentPage = 1
  fetchComments()
}

// 查看评论详情
const handleView = (row) => {
  currentComment.value = row
  // 重置点赞状态
  isLikeDisabled.value = false
  detailDialogVisible.value = true
}

// 处理删除
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该评论吗？此操作不可逆', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteCommentService(row.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        fetchComments()
      }
    } catch (error) {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

// 获取歌曲名称
const getSongName = (songId) => {
  if (!songId) return '未知歌曲'
  const song = songs.value.find(item => Number(item.id) === Number(songId))
  return song ? song.name : `未知歌曲(ID:${songId})`
}

// 获取歌单标题
const getSongListTitle = (songListId) => {
  if (!songListId) return '未知歌单'
  const songList = songLists.value.find(item => Number(item.id) === Number(songListId))
  return songList ? songList.title : `未知歌单(ID:${songListId})`
}

// 处理分页变化
const handlePaginationChange = ({ page, size }) => {
  pagination.currentPage = page;
  pagination.pageSize = size;
  fetchComments();
}

// 处理删除评论
const handleDeleteFromDetail = () => {
  ElMessageBox.confirm('确定要删除该评论吗？此操作不可逆', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteCommentService(currentComment.value.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        fetchComments()
        detailDialogVisible.value = false
      }
    } catch (error) {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

// 格式化评论内容预览
const formatCommentContent = (content) => {
  if (!content) return '';
  // 移除换行符，限制长度
  return content.replace(/[\r\n]/g, ' ').substring(0, 50) + (content.length > 50 ? '...' : '');
}

// 格式化带换行符的内容
const formatContentWithLineBreaks = (content) => {
  if (!content) return '';
  return content;
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) {
    return timeStr;
  }
}

// 处理点赞
const handleLike = async () => {
  if (!currentComment.value || isLikeDisabled.value) return;
  
  try {
    const res = await likeCommentService(currentComment.value.id);
    if (res.code === 200) {
      ElMessage.success('点赞成功');
      // 更新点赞数和状态
      if (currentComment.value.up === undefined) {
        currentComment.value.up = 1;
      } else {
        currentComment.value.up += 1;
      }
      isLikeDisabled.value = true;
      // 刷新评论列表
      fetchComments();
    } else {
      ElMessage.error(res.message || '点赞失败');
    }
  } catch (error) {
    console.error('点赞失败:', error);
    ElMessage.error('点赞失败');
  }
}

onMounted(() => {
  fetchComments()
  fetchSongs()
  fetchSongLists()
})
</script>

<style scoped lang="scss">
.comment-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }
  
  .sub-title {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
}

.search-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  span {
    font-size: 16px;
    font-weight: 500;
  }
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

// 用户信息样式
.user-info {
  display: flex;
  align-items: center;
  .user-name {
    margin-left: 8px;
    font-weight: 500;
  }
}

// 评论目标样式
.comment-target {
  display: flex;
  align-items: center;
  .target-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
    display: inline-block;
  }
}

// 评论内容预览样式
.comment-content-preview {
  color: #606266;
  line-height: 1.5;
}

// 点赞数样式
.likes-count {
  display: flex;
  align-items: center;
  color: #ff9900;
  .el-icon {
    margin-right: 5px;
  }
}

.comment-detail {
  .comment-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    
    .user-avatar {
      margin-right: 15px;
    }
    
    .comment-meta {
      .user-name {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 5px 0;
      }
      
      .comment-time {
        font-size: 14px;
        color: #666;
      }
    }
  }
  
  .comment-info {
    margin-bottom: 20px;
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    
    .info-item {
      display: flex;
      align-items: center;
      margin: 10px 0;
      line-height: 1.5;
      
      .likes {
        display: flex;
        align-items: center;
        color: #ff9900;
        
        .el-icon {
          margin-right: 5px;
        }
      }
    }
  }
  
  .comment-content {
    margin-bottom: 20px;
    
    .content-box {
      padding: 15px;
      background-color: #f5f7fa;
      border-radius: 4px;
      margin-top: 10px;
      line-height: 1.8;
      min-height: 100px;
      white-space: pre-wrap;
      font-size: 15px;
    }
  }
  
  .label {
    color: #606266;
    font-weight: 500;
    margin-right: 10px;
  }
}

.comment-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.operation-buttons-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
</style> 