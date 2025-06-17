<template>
  <div class="comment-manage">
    <!-- 搜索工具栏 -->
    <div class="toolbar">
      <el-form :inline="true" :model="queryParams" class="demo-form-inline">
        <el-form-item label="电影">
          <el-select 
            v-model="queryParams.movieId" 
            placeholder="请选择电影" 
            clearable 
            filterable 
            :loading="moviesLoading"
            @change="handleMovieChange"
            style="width: 300px">
            <el-option
              v-for="item in movieOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input v-model="queryParams.userId" placeholder="请输入用户ID" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 显示当前选中电影的信息 -->
      <div v-if="selectedMovie" class="selected-movie-info">
        <h3>当前电影: {{ selectedMovie.title }}</h3>
        <p v-if="selectedMovie.director">导演: {{ selectedMovie.director }}</p>
        <p v-if="selectedMovie.releaseDate">上映日期: {{ selectedMovie.releaseDate }}</p>
      </div>
    </div>

    <!-- 评论列表 -->
    <el-table
      v-loading="loading"
      :data="commentList"
      border
      stripe
      style="width: 100%"
    >
      <el-table-column type="index" width="50" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="电影" min-width="150" :show-overflow-tooltip="true">
        <template #default="{ row }">
          {{ getMovieName(row.movieId) }}
        </template>
      </el-table-column>
      <el-table-column prop="userId" label="用户ID" width="180" :show-overflow-tooltip="true" />
      <el-table-column prop="content" label="评论内容" min-width="200" :show-overflow-tooltip="true" />
      <el-table-column prop="rate" label="评分" width="150">
        <template #default="scope">
          <el-rate
            v-model="scope.row.rate"
            disabled
            text-color="#ff9900"
            score-template="{value}"
            show-score
          />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="180" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="handleView(scope.row)">查看</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 空数据提示 -->
    <el-empty v-if="!loading && commentList.length === 0" description="暂无评论数据">
      <template #image>
        <el-icon style="font-size: 60px"><ChatDotSquare /></el-icon>
      </template>
      <template #description>
        <p>{{ queryParams.movieId ? '该电影暂无评论' : '请选择电影查看评论' }}</p>
      </template>
    </el-empty>

    <!-- 分页组件 -->
    <div class="pagination" v-if="commentList.length > 0">
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.size"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 评论详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="评论详情"
      width="600px"
    >
      <div class="comment-detail">
        <div class="detail-item">
          <span class="label">评论ID:</span>
          <span class="value">{{ selectedComment.id }}</span>
        </div>
        <div class="detail-item">
          <span class="label">用户ID:</span>
          <span class="value">{{ selectedComment.userId }}</span>
        </div>
        <div class="detail-item">
          <span class="label">电影:</span>
          <span class="value">{{ getMovieName(selectedComment.movieId) }}</span>
        </div>
        <div class="detail-item">
          <span class="label">评分:</span>
          <span class="value">
            <el-rate
              v-model="selectedComment.rate"
              disabled
              text-color="#ff9900"
              score-template="{value}"
              show-score
            />
          </span>
        </div>
        <div class="detail-item">
          <span class="label">创建时间:</span>
          <span class="value">{{ selectedComment.createTime }}</span>
        </div>
        <div class="detail-item content">
          <span class="label">评论内容:</span>
          <div class="value-content">{{ selectedComment.content }}</div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
          <el-button type="danger" @click="handleDeleteInDialog">删除</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getCommentsByMovieIdService,
  deleteCommentService,
  getMovieListService  
} from '@/api/video.js'

// 查询参数
const queryParams = reactive({
  page: 1,
  size: 10,
  movieId: '',
  userId: ''
})

// 评论列表数据
const commentList = ref([])
const total = ref(0)
const loading = ref(false)
const moviesLoading = ref(false)

// 电影列表数据
const movieOptions = ref([])
const selectedMovie = ref(null)  // 新增：选中的电影对象

// 评论详情相关变量
const dialogVisible = ref(false)
const selectedComment = ref({})

// 生命周期钩子 - 组件挂载时加载所有电影列表
onMounted(() => {
  fetchAllMovies()
})

// 获取所有电影列表
const fetchAllMovies = async () => {
  try {
    moviesLoading.value = true
    const response = await getMovieListService(1, 1000)  // 获取大量电影以确保全部显示
    
    if (response.code === 200) {
      const movies = response.data.records || []
      movieOptions.value = movies.map(movie => ({
        value: movie.id,
        label: movie.title,  // 只使用电影标题作为显示值
        fullData: movie  // 存储完整电影数据以便后续使用
      }))
      
      ElMessage.success(`成功加载 ${movies.length} 部电影`)
    } else {
      ElMessage.error(response.message || '获取电影列表失败')
    }
  } catch (error) {
    console.error('获取电影列表出错:', error)
    ElMessage.error('获取电影列表失败: ' + (error.message || '未知错误'))
    movieOptions.value = []
  } finally {
    moviesLoading.value = false
  }
}

// 获取评论列表
const fetchCommentList = async () => {
  if (!queryParams.movieId) {
    commentList.value = []
    total.value = 0
    return
  }
  
  try {
    loading.value = true
    const response = await getCommentsByMovieIdService(
      queryParams.movieId, 
      queryParams.page, 
      queryParams.size
    )
    
    if (response.code === 200) {
      // 过滤用户ID（如果有用户ID筛选条件）
      let comments = response.data.records || []
      if (queryParams.userId) {
        comments = comments.filter(comment => 
          comment.userId.includes(queryParams.userId)
        )
      }
      
      commentList.value = comments
      total.value = response.data.total || 0
      
      // 如果没有评论，显示提示信息
      if (comments.length === 0) {
        const movieName = getMovieName(queryParams.movieId)
        ElMessage.info(`电影《${movieName}》暂无评论`)
      }
    } else {
      ElMessage.error(response.message || '获取评论列表失败')
    }
  } catch (error) {
    console.error('获取评论列表出错:', error)
    ElMessage.error('获取评论列表失败')
  } finally {
    loading.value = false
  }
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  queryParams.size = size
  fetchCommentList()
}

// 处理页码变化
const handleCurrentChange = (page) => {
  queryParams.page = page
  fetchCommentList()
}

// 电影选择变化时的处理
const handleMovieChange = (movieId) => {
  if (!movieId) {
    selectedMovie.value = null
    commentList.value = []
    total.value = 0
    return
  }
  
  // 找到选中的电影对象
  selectedMovie.value = movieOptions.value.find(movie => movie.value === movieId)?.fullData || null
  
  // 重置页码并查询评论
  queryParams.page = 1
  fetchCommentList()
}

// 查询按钮点击事件
const handleQuery = () => {
  queryParams.page = 1
  fetchCommentList()
}

// 重置查询
const resetQuery = () => {
  queryParams.movieId = ''
  queryParams.userId = ''
  queryParams.page = 1
  selectedMovie.value = null
  commentList.value = []
  total.value = 0
}

// 查看评论详情
const handleView = (row) => {
  selectedComment.value = { ...row }
  dialogVisible.value = true
}

// 删除评论
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除ID为 ${row.id} 的评论吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteComment(row.id)
    } catch (error) {
      console.error('删除评论出错:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 在对话框中删除评论
const handleDeleteInDialog = () => {
  ElMessageBox.confirm(`确定要删除ID为 ${selectedComment.value.id} 的评论吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteComment(selectedComment.value.id)
      dialogVisible.value = false
    } catch (error) {
      console.error('删除评论出错:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 删除评论公共方法
const deleteComment = async (id) => {
  try {
    const res = await deleteCommentService(id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchCommentList()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    console.error('删除评论出错:', error)
    ElMessage.error('删除失败')
    throw error
  }
}

// 获取电影名称
const getMovieName = (movieId) => {
  const movie = movieOptions.value.find(m => m.value === movieId)
  return movie ? movie.label : `电影(ID:${movieId})`
}
</script>

<style scoped lang="scss">
.comment-manage {
  padding: 20px 0;
  
  .toolbar {
    margin-bottom: 20px;
    
    .selected-movie-info {
      margin-top: 15px;
      padding: 10px 15px;
      background-color: #f5f7fa;
      border-radius: 4px;
      
      h3 {
        margin: 0 0 10px 0;
        font-size: 16px;
        color: #303133;
      }
      
      p {
        margin: 5px 0;
        color: #606266;
        font-size: 14px;
      }
    }
  }
  
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  
  .comment-detail {
    padding: 10px;
    
    .detail-item {
      margin-bottom: 15px;
      display: flex;
      
      .label {
        font-weight: bold;
        width: 100px;
        color: #606266;
      }
      
      .value {
        flex: 1;
      }
      
      &.content {
        display: block;
        
        .value-content {
          margin-top: 10px;
          padding: 15px;
          background-color: #f5f7fa;
          border-radius: 4px;
          line-height: 1.6;
          color: #333;
          white-space: pre-wrap;
        }
      }
    }
  }
}
</style> 