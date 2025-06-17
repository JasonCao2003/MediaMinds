<template>
  <div class="tag-manage">
    <!-- 搜索工具栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleAdd">添加标签</el-button>
    </div>

    <!-- 标签列表 -->
    <el-table
      v-loading="loading"
      :data="tagList"
      border
      stripe
      style="width: 100%"
    >
      <el-table-column type="index" width="50" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="标签名称" min-width="120" />
      <el-table-column prop="description" label="描述" min-width="200" :show-overflow-tooltip="true" />
      <el-table-column prop="createTime" label="创建时间" width="180" />
      <el-table-column prop="updateTime" label="更新时间" width="180" />
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button link type="primary" @click="handleViewMovies(scope.row)">查看影片</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <div class="pagination">
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

    <!-- 标签表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加标签' : '编辑标签'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="tagFormRef"
        :model="tagForm"
        :rules="tagRules"
        label-width="100px"
      >
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="tagForm.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="tagForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入标签描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确认</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 标签下电影列表对话框 -->
    <el-dialog
      v-model="moviesDialogVisible"
      :title="`标签'${selectedTag.name || ''}'下的电影`"
      width="800px"
    >
      <el-table
        v-loading="moviesLoading"
        :data="tagMovies"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column type="index" width="50" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="电影名称" min-width="120" :show-overflow-tooltip="true" />
        <el-table-column label="封面" width="100">
          <template #default="scope">
            <el-image
              style="width: 60px; height: 80px; border-radius: 4px"
              :src="scope.row.picture"
              fit="cover"
              :preview-src-list="[scope.row.picture]"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><el-icon-picture /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="directedBy" label="导演" min-width="100" :show-overflow-tooltip="true" />
        <el-table-column prop="rate" label="评分" width="100">
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
      </el-table>
      
      <!-- 电影列表分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="moviesQueryParams.page"
          v-model:page-size="moviesQueryParams.size"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="moviesTotal"
          @size-change="handleMoviesSizeChange"
          @current-change="handleMoviesCurrentChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTagListService,
  getTagByIdService,
  addTagService,
  updateTagService,
  deleteTagService,
  getMoviesByTagIdService
} from '@/api/video.js'

// 查询参数
const queryParams = reactive({
  page: 1,
  size: 10
})

// 标签列表数据
const tagList = ref([])
const total = ref(0)
const loading = ref(false)

// 标签表单相关变量
const dialogVisible = ref(false)
const dialogType = ref('add') // 'add' 或 'edit'
const tagFormRef = ref(null)
const tagForm = reactive({
  id: undefined,
  name: '',
  description: ''
})

// 表单校验规则
const tagRules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在1到50个字符之间', trigger: 'blur' }
  ],
  description: [
    { max: 200, message: '长度不能超过200个字符', trigger: 'blur' }
  ]
}

// 标签下电影相关变量
const moviesDialogVisible = ref(false)
const selectedTag = ref({})
const tagMovies = ref([])
const moviesTotal = ref(0)
const moviesLoading = ref(false)
const moviesQueryParams = reactive({
  page: 1,
  size: 10
})

// 生命周期钩子
onMounted(() => {
  fetchTagList()
})

// 获取标签列表
const fetchTagList = async () => {
  try {
    loading.value = true
    const response = await getTagListService(queryParams.page, queryParams.size)
    
    if (response.code === 200) {
      tagList.value = response.data.records || []
      total.value = response.data.total || 0
    } else {
      ElMessage.error(response.message || '获取标签列表失败')
    }
  } catch (error) {
    console.error('获取标签列表出错:', error)
    ElMessage.error('获取标签列表失败')
  } finally {
    loading.value = false
  }
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  queryParams.size = size
  fetchTagList()
}

// 处理页码变化
const handleCurrentChange = (page) => {
  queryParams.page = page
  fetchTagList()
}

// 添加标签
const handleAdd = () => {
  dialogType.value = 'add'
  resetForm()
  dialogVisible.value = true
}

// 编辑标签
const handleEdit = async (row) => {
  dialogType.value = 'edit'
  resetForm()
  
  try {
    // 获取标签详情数据
    const response = await getTagByIdService(row.id)
    
    if (response.code === 200) {
      Object.keys(tagForm).forEach(key => {
        if (response.data[key] !== undefined) {
          tagForm[key] = response.data[key]
        }
      })
      dialogVisible.value = true
    } else {
      ElMessage.error(response.message || '获取标签详情失败')
    }
  } catch (error) {
    console.error('获取标签详情出错:', error)
    ElMessage.error('获取标签详情失败')
  }
}

// 查看标签下的电影
const handleViewMovies = (row) => {
  selectedTag.value = row
  moviesQueryParams.page = 1
  moviesQueryParams.size = 10
  fetchTagMovies()
  moviesDialogVisible.value = true
}

// 获取标签下的电影列表
const fetchTagMovies = async () => {
  if (!selectedTag.value.id) return
  
  try {
    moviesLoading.value = true
    const response = await getMoviesByTagIdService(
      selectedTag.value.id, 
      moviesQueryParams.page, 
      moviesQueryParams.size
    )
    
    if (response.code === 200) {
      tagMovies.value = response.data.records || []
      moviesTotal.value = response.data.total || 0
    } else {
      ElMessage.error(response.message || '获取标签下电影列表失败')
    }
  } catch (error) {
    console.error('获取标签下电影列表出错:', error)
    ElMessage.error('获取标签下电影列表失败')
  } finally {
    moviesLoading.value = false
  }
}

// 电影列表分页处理
const handleMoviesSizeChange = (size) => {
  moviesQueryParams.size = size
  fetchTagMovies()
}

const handleMoviesCurrentChange = (page) => {
  moviesQueryParams.page = page
  fetchTagMovies()
}

// 删除标签
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除标签 "${row.name}" 吗？删除后该标签下的电影将不再属于此标签。`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteTagService(row.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        fetchTagList()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      console.error('删除标签出错:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 重置表单
const resetForm = () => {
  if (tagFormRef.value) {
    tagFormRef.value.resetFields()
  }
  
  tagForm.id = undefined
  tagForm.name = ''
  tagForm.description = ''
}

// 提交表单
const submitForm = async () => {
  if (!tagFormRef.value) return
  
  await tagFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    try {
      let res
      if (dialogType.value === 'add') {
        res = await addTagService(tagForm)
      } else {
        res = await updateTagService(tagForm)
      }
      
      if (res.code === 200) {
        ElMessage.success(`${dialogType.value === 'add' ? '添加' : '编辑'}成功`)
        dialogVisible.value = false
        fetchTagList()
      } else {
        ElMessage.error(res.message || `${dialogType.value === 'add' ? '添加' : '编辑'}失败`)
      }
    } catch (error) {
      console.error(`${dialogType.value === 'add' ? '添加' : '编辑'}标签出错:`, error)
      ElMessage.error(`${dialogType.value === 'add' ? '添加' : '编辑'}失败`)
    }
  })
}
</script>

<style scoped lang="scss">
.tag-manage {
  padding: 20px 0;
  
  .toolbar {
    margin-bottom: 20px;
    display: flex;
    justify-content: flex-end;
  }
  
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  
  .image-slot {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: #f5f7fa;
    color: #909399;
    font-size: 20px;
  }
}
</style> 