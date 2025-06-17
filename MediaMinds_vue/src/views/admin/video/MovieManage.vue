<template>
  <div class="movie-manage">
    <!-- 搜索工具栏 -->
    <div class="toolbar">
      <el-form :inline="true" :model="queryParams" class="demo-form-inline">
        <el-form-item label="电影名称">
          <el-input v-model="queryParams.keyword" placeholder="请输入电影名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="导演">
          <el-input v-model="queryParams.director" placeholder="请输入导演" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="success" @click="handleAdd">添加电影</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 电影列表 -->
    <el-table
      v-loading="loading"
      :data="movieList"
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
      <el-table-column prop="actor" label="主演" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column prop="type" label="分类" width="100" :show-overflow-tooltip="true" />
      <el-table-column prop="time" label="时长(分钟)" width="100" />
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
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button link type="primary" @click="handleUploadVideo(scope.row)">上传视频</el-button>
          <el-button link type="primary" @click="handleUploadCover(scope.row)">上传封面</el-button>
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

    <!-- 电影表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加电影' : '编辑电影'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="movieFormRef"
        :model="movieForm"
        :rules="movieRules"
        label-width="100px"
      >
        <el-form-item label="电影名称" prop="name">
          <el-input v-model="movieForm.name" placeholder="请输入电影名称" />
        </el-form-item>
        <el-form-item label="导演" prop="directedBy">
          <el-input v-model="movieForm.directedBy" placeholder="请输入导演" />
        </el-form-item>
        <el-form-item label="主演" prop="actor">
          <el-input 
            v-model="movieForm.actor" 
            placeholder="请输入主演，多个演员用逗号分隔"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item label="分类" prop="type">
          <el-input v-model="movieForm.type" placeholder="请输入电影分类" />
        </el-form-item>
        <el-form-item label="电影时长" prop="time">
          <el-input-number v-model="movieForm.time" :min="1" :max="999" placeholder="分钟" />
        </el-form-item>
        <el-form-item label="地区" prop="area">
          <el-select v-model="movieForm.area" placeholder="请选择地区">
            <el-option label="中国大陆" :value="1" />
            <el-option label="中国香港" :value="2" />
            <el-option label="中国台湾" :value="3" />
            <el-option label="美国" :value="4" />
            <el-option label="日本" :value="5" />
            <el-option label="韩国" :value="6" />
            <el-option label="英国" :value="7" />
            <el-option label="法国" :value="8" />
            <el-option label="其他" :value="9" />
          </el-select>
        </el-form-item>
        <el-form-item label="语言" prop="language">
          <el-select v-model="movieForm.language" placeholder="请选择语言">
            <el-option label="中文" :value="1" />
            <el-option label="英语" :value="2" />
            <el-option label="日语" :value="3" />
            <el-option label="韩语" :value="4" />
            <el-option label="法语" :value="5" />
            <el-option label="其他" :value="6" />
          </el-select>
        </el-form-item>
        <el-form-item label="上映时间" prop="showTime">
          <el-date-picker
            v-model="movieForm.showTime"
            type="date"
            placeholder="选择上映日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="简介" prop="abs">
          <el-input
            v-model="movieForm.abs"
            type="textarea"
            :rows="3"
            placeholder="请输入电影简介"
          />
        </el-form-item>
        <el-form-item label="详情" prop="info">
          <el-input
            v-model="movieForm.info"
            type="textarea"
            :rows="5"
            placeholder="请输入电影详情"
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

    <!-- 上传封面对话框 -->
    <el-dialog v-model="coverDialogVisible" title="上传电影封面" width="500px">
      <el-upload
        class="cover-upload"
        action="#"
        :http-request="uploadCover"
        :show-file-list="false"
        :before-upload="beforeCoverUpload"
      >
        <img v-if="coverUrl" :src="coverUrl" class="cover-preview" />
        <el-icon v-else class="cover-uploader-icon"><el-icon-plus /></el-icon>
      </el-upload>
      <div class="upload-tip">* 请上传比例为3:4的电影海报，建议尺寸为300x400像素</div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="coverDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="coverDialogVisible = false">完成</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 上传视频对话框 -->
    <el-dialog v-model="videoDialogVisible" title="上传电影视频" width="500px">
      <el-upload
        class="video-upload"
        action="#"
        :http-request="uploadVideo"
        :show-file-list="false"
        :before-upload="beforeVideoUpload"
      >
        <video v-if="videoUrl" :src="videoUrl" class="video-preview" controls></video>
        <div v-else class="video-uploader">
          <el-icon class="video-uploader-icon"><el-icon-video-camera /></el-icon>
          <div class="el-upload__text">点击上传视频</div>
        </div>
      </el-upload>
      <div class="upload-tip">* 请上传MP4格式视频文件，大小不超过500MB</div>
      <div v-if="uploadProgress > 0" class="upload-progress">
        <el-progress :percentage="uploadProgress" />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="videoDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="videoDialogVisible = false">完成</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getMovieListService,
  addMovieService,
  updateMovieService,
  deleteMovieService,
  updateCoverService,
  updateVideoService
} from '@/api/video.js'

// 查询参数
const queryParams = reactive({
  page: 1,
  size: 10,
  keyword: '',
  director: ''
})

// 电影列表数据
const movieList = ref([])
const total = ref(0)
const loading = ref(false)

// 表单相关变量
const dialogVisible = ref(false)
const dialogType = ref('add') // 'add' 或 'edit'
const movieFormRef = ref(null)
const movieForm = reactive({
  id: undefined,
  name: '',
  directedBy: '',
  actor: '',
  type: '',
  time: 90,
  area: 1,
  language: 1,
  abs: '',
  info: '',
  showTime: '',
  picture: '',
  video: ''
})

// 表单校验规则
const movieRules = {
  name: [
    { required: true, message: '请输入电影名称', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在1到100个字符之间', trigger: 'blur' }
  ],
  directedBy: [
    { required: true, message: '请输入导演', trigger: 'blur' }
  ],
  actor: [
    { required: true, message: '请输入主演', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请输入分类', trigger: 'blur' }
  ],
  time: [
    { required: true, message: '请输入电影时长', trigger: 'blur' }
  ],
  area: [
    { required: true, message: '请选择地区', trigger: 'change' }
  ],
  language: [
    { required: true, message: '请选择语言', trigger: 'change' }
  ],
  showTime: [
    { required: true, message: '请选择上映时间', trigger: 'change' }
  ],
  abs: [
    { required: true, message: '请输入电影简介', trigger: 'blur' }
  ]
}

// 封面上传相关变量
const coverDialogVisible = ref(false)
const coverUrl = ref('')
const currentMovieId = ref(null)

// 视频上传相关变量
const videoDialogVisible = ref(false)
const videoUrl = ref('')
const uploadProgress = ref(0)

// 生命周期钩子
onMounted(() => {
  fetchMovieList()
})

// 获取电影列表
const fetchMovieList = async () => {
  try {
    loading.value = true
    // 构建查询参数
    let params = {
      page: queryParams.page,
      size: queryParams.size
    }
    
    // 根据条件选择不同的API
    let response
    if (queryParams.director && queryParams.director.trim() !== '') {
      // 按导演搜索
      response = await searchMovieByDirectorService(queryParams.director, params.page, params.size)
    } else if (queryParams.keyword && queryParams.keyword.trim() !== '') {
      // 按关键词搜索
      response = await searchMovieService(queryParams.keyword, params.page, params.size)
    } else {
      // 获取所有电影
      response = await getMovieListService(params.page, params.size)
    }
    
    if (response.code === 200) {
      movieList.value = response.data.records || []
      total.value = response.data.total || 0
    } else {
      ElMessage.error(response.message || '获取电影列表失败')
    }
  } catch (error) {
    console.error('获取电影列表出错:', error)
    ElMessage.error('获取电影列表失败')
  } finally {
    loading.value = false
  }
}

// 查询按钮点击事件
const handleQuery = () => {
  queryParams.page = 1
  fetchMovieList()
}

// 重置查询
const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.director = ''
  queryParams.page = 1
  fetchMovieList()
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  queryParams.size = size
  fetchMovieList()
}

// 处理页码变化
const handleCurrentChange = (page) => {
  queryParams.page = page
  fetchMovieList()
}

// 添加电影
const handleAdd = () => {
  dialogType.value = 'add'
  resetForm()
  dialogVisible.value = true
}

// 编辑电影
const handleEdit = (row) => {
  dialogType.value = 'edit'
  resetForm()
  // 填充表单数据
  Object.keys(movieForm).forEach(key => {
    if (row[key] !== undefined) {
      movieForm[key] = row[key]
    }
  })
  dialogVisible.value = true
}

// 删除电影
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除电影《${row.name}》吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteMovieService(row.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        fetchMovieList()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      console.error('删除电影出错:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 重置表单
const resetForm = () => {
  if (movieFormRef.value) {
    movieFormRef.value.resetFields()
  }
  
  Object.keys(movieForm).forEach(key => {
    if (key === 'time') {
      movieForm[key] = 90
    } else if (key === 'area' || key === 'language') {
      movieForm[key] = 1
    } else {
      movieForm[key] = ''
    }
  })
  movieForm.id = undefined
}

// 提交表单
const submitForm = async () => {
  if (!movieFormRef.value) return
  
  await movieFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    try {
      let res
      if (dialogType.value === 'add') {
        res = await addMovieService(movieForm)
      } else {
        res = await updateMovieService(movieForm)
      }
      
      if (res.code === 200) {
        ElMessage.success(`${dialogType.value === 'add' ? '添加' : '编辑'}成功`)
        dialogVisible.value = false
        fetchMovieList()
      } else {
        ElMessage.error(res.message || `${dialogType.value === 'add' ? '添加' : '编辑'}失败`)
      }
    } catch (error) {
      console.error(`${dialogType.value === 'add' ? '添加' : '编辑'}电影出错:`, error)
      ElMessage.error(`${dialogType.value === 'add' ? '添加' : '编辑'}失败`)
    }
  })
}

// 处理上传封面
const handleUploadCover = (row) => {
  currentMovieId.value = row.id
  coverUrl.value = row.picture
  coverDialogVisible.value = true
}

// 上传前检查封面格式
const beforeCoverUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  
  if (!isImage) {
    ElMessage.error('上传封面只能是图片格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('上传封面大小不能超过 2MB!')
    return false
  }
  return true
}

// 上传封面
const uploadCover = async (params) => {
  try {
    const res = await updateCoverService(currentMovieId.value, params.file)
    if (res.code === 200) {
      ElMessage.success('封面上传成功')
      coverUrl.value = URL.createObjectURL(params.file)
      fetchMovieList() // 刷新列表
    } else {
      ElMessage.error(res.message || '封面上传失败')
    }
  } catch (error) {
    console.error('上传封面出错:', error)
    ElMessage.error('封面上传失败')
  }
}

// 处理上传视频
const handleUploadVideo = (row) => {
  currentMovieId.value = row.id
  videoUrl.value = row.video
  uploadProgress.value = 0
  videoDialogVisible.value = true
}

// 上传前检查视频格式
const beforeVideoUpload = (file) => {
  const isVideo = file.type.startsWith('video/')
  const isLt500M = file.size / 1024 / 1024 < 500
  
  if (!isVideo) {
    ElMessage.error('上传视频格式不正确!')
    return false
  }
  if (!isLt500M) {
    ElMessage.error('上传视频大小不能超过 500MB!')
    return false
  }
  return true
}

// 上传视频
const uploadVideo = async (params) => {
  try {
    // 模拟上传进度
    const mockProgress = setInterval(() => {
      uploadProgress.value += 10
      if (uploadProgress.value >= 90) {
        clearInterval(mockProgress)
      }
    }, 300)
    
    const res = await updateVideoService(currentMovieId.value, params.file)
    clearInterval(mockProgress)
    
    if (res.code === 200) {
      uploadProgress.value = 100
      ElMessage.success('视频上传成功')
      videoUrl.value = URL.createObjectURL(params.file)
      fetchMovieList() // 刷新列表
    } else {
      uploadProgress.value = 0
      ElMessage.error(res.message || '视频上传失败')
    }
  } catch (error) {
    console.error('上传视频出错:', error)
    uploadProgress.value = 0
    ElMessage.error('视频上传失败')
  }
}
</script>

<style scoped lang="scss">
.movie-manage {
  padding: 20px 0;
  
  .toolbar {
    margin-bottom: 20px;
  }
  
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  
  .cover-upload {
    text-align: center;
    
    .cover-preview {
      width: 200px;
      height: 266px;
      object-fit: cover;
      border-radius: 4px;
    }
    
    .cover-uploader-icon {
      font-size: 28px;
      color: #8c939d;
      width: 200px;
      height: 266px;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px dashed #d9d9d9;
      border-radius: 4px;
      cursor: pointer;
    }
  }
  
  .video-upload {
    text-align: center;
    
    .video-preview {
      width: 100%;
      max-height: 300px;
      border-radius: 4px;
    }
    
    .video-uploader {
      border: 1px dashed #d9d9d9;
      border-radius: 6px;
      cursor: pointer;
      padding: 40px;
      text-align: center;
      
      .video-uploader-icon {
        font-size: 48px;
        color: #8c939d;
      }
      
      .el-upload__text {
        color: #606266;
        font-size: 14px;
        margin-top: 10px;
      }
    }
  }
  
  .upload-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 10px;
    text-align: center;
  }
  
  .upload-progress {
    margin-top: 20px;
  }
  
  // 图片缩略图样式
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