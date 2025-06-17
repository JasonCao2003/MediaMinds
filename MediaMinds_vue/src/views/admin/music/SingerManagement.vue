<template>
  <div class="singer-management">
    <div class="page-header">
      <h2>歌手管理</h2>
      <p class="sub-title">管理所有歌手资源</p>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <span>歌手搜索</span>
          <el-button type="primary" @click="openAddDialog" icon="Plus">添加新歌手</el-button>
        </div>
      </template>
      
      <el-form :model="queryParams" inline>
        <el-form-item label="歌手名称">
          <el-input v-model="queryParams.name" placeholder="请输入歌手名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="性别">
          <el-select v-model="queryParams.sex" placeholder="请选择性别" clearable>
            <el-option label="男" value="1"></el-option>
            <el-option label="女" value="0"></el-option>
            <el-option label="组合" value="2"></el-option>
            <el-option label="未知" value="-1"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery" icon="Search">查询</el-button>
          <el-button @click="resetQuery" icon="RefreshRight">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 歌手列表 -->
    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>歌手列表</span>
          <div>
            <el-button type="success" icon="Upload">批量导入</el-button>
            <el-button type="info" icon="Download">导出数据</el-button>
          </div>
        </div>
      </template>

      <el-table 
        :data="singers" 
        style="width: 100%" 
        border 
        stripe 
        v-loading="loading"
        height="550">
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column type="index" width="50" label="序号"></el-table-column>
        <el-table-column label="头像" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.pic" 
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 50%;"
            >
              <template #error>
                <div class="avatar-placeholder">
                  <el-icon><el-icon-user /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="歌手名称" sortable min-width="120"></el-table-column>
        <el-table-column prop="sex" label="性别" width="100">
          <template #default="{ row }">
            <el-tag :type="getSexTagType(row.sex)">{{ getSexLabel(row.sex) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="birth" label="出生日期" sortable width="150"></el-table-column>
        <el-table-column prop="location" label="所在地区" min-width="120"></el-table-column>
        <el-table-column prop="introduction" label="简介" show-overflow-tooltip min-width="180"></el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="operation-buttons">
              <div class="button-row">
                <el-button type="primary" size="small" @click="handleEdit(row)" icon="Edit">编辑</el-button>
                <el-button type="danger" size="small" @click="handleDelete(row)" icon="Delete">删除</el-button>
              </div>
              <div class="button-row">
                <el-button type="success" size="small" @click="handleUploadAvatar(row)" icon="Avatar">更新头像</el-button>
              </div>
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

    <!-- 添加/编辑歌手对话框 -->
    <el-dialog
      :title="dialogStatus === 'add' ? '添加新歌手' : '编辑歌手'"
      v-model="dialogVisible"
      width="600px"
    >
      <el-form
        ref="singerFormRef"
        :model="singerForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="歌手名称" prop="name">
          <el-input v-model="singerForm.name" placeholder="请输入歌手名称"></el-input>
        </el-form-item>
        <el-form-item label="性别" prop="sex">
          <el-radio-group v-model="singerForm.sex">
            <el-radio :label="1">男</el-radio>
            <el-radio :label="0">女</el-radio>
            <el-radio :label="2">组合</el-radio>
            <el-radio :label="-1">未知</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="出生日期" prop="birth">
          <el-date-picker
            v-model="singerForm.birth"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="所在地区" prop="location">
          <el-input v-model="singerForm.location" placeholder="请输入地区，如：中国香港"></el-input>
        </el-form-item>
        <el-form-item label="简介" prop="introduction">
          <el-input
            v-model="singerForm.introduction"
            type="textarea"
            rows="4"
            placeholder="请输入歌手简介"
          ></el-input>
        </el-form-item>
        <el-form-item label="头像" prop="pic" v-if="dialogStatus === 'add'">
          <el-upload
            class="avatar-uploader"
            action="#"
            :http-request="uploadAvatarFile"
            :show-file-list="false"
            :on-change="handleAvatarChange"
            :auto-upload="false"
          >
            <img v-if="avatarImageUrl" :src="avatarImageUrl" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><plus /></el-icon>
          </el-upload>
          <div class="el-upload__tip">请上传歌手头像图片，支持jpg/png格式</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 上传头像对话框 -->
    <el-dialog title="更新头像" v-model="avatarDialogVisible" width="400px">
      <el-upload
        class="avatar-uploader"
        action="#"
        :http-request="uploadAvatarFile"
        :show-file-list="false"
        :on-change="handleAvatarChange"
        :auto-upload="false"
      >
        <img v-if="avatarImageUrl" :src="avatarImageUrl" class="avatar" />
        <el-icon v-else class="avatar-uploader-icon"><plus /></el-icon>
      </el-upload>
      <div class="el-upload__tip">请上传歌手头像图片，支持jpg/png格式</div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="avatarDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAvatarUpload">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminPagination from '@/components/AdminPagination.vue'
import { 
  getAllSingersService, 
  getSingersByNameService, 
  getSingersBySexService,
  addSingerService,
  updateSingerService,
  deleteSingerService,
  uploadSingerAvatarService
} from '@/api/music.js'

// 歌手列表
const singers = ref([])
// 加载状态
const loading = ref(false)

// 查询参数
const queryParams = reactive({
  name: '',
  sex: ''
})

// 分页参数
const pagination = reactive({
  currentPage: 1,
  pageSize: 6,
  total: 0
})

// 对话框状态
const dialogVisible = ref(false)
const dialogStatus = ref('add') // add or edit
const avatarDialogVisible = ref(false)

// 表单引用
const singerFormRef = ref(null)

// 歌手表单数据
const singerForm = reactive({
  id: null,
  name: '',
  sex: 1,
  birth: '',
  location: '',
  introduction: '',
  pic: ''
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入歌手名称', trigger: 'blur' }],
  sex: [{ required: true, message: '请选择性别', trigger: 'change' }]
}

// 头像URL
const avatarImageUrl = ref('')

// 当前编辑的歌手
const currentSinger = ref(null)
const avatarFile = ref(null)

// 获取所有歌手
const fetchSingers = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    const res = await getAllSingersService(params)
    if (res.code === 200) {
      singers.value = res.data.records || []
      pagination.total = res.data.total || 0
    } else {
      ElMessage.error(res.message || '获取歌手列表失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取歌手列表失败')
  } finally {
    loading.value = false
  }
}

// 根据条件筛选歌手
const handleQuery = async () => {
  loading.value = true
  pagination.currentPage = 1
  try {
    let res
    const params = {
      pageNum: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    if (queryParams.name) {
      res = await getSingersByNameService(queryParams.name, params)
    } else if (queryParams.sex !== null && queryParams.sex !== '') {
      res = await getSingersBySexService(queryParams.sex, params)
    } else {
      res = await getAllSingersService(params)
    }
    
    if (res.code === 200) {
      singers.value = res.data.records || []
      pagination.total = res.data.total || 0
    } else {
      ElMessage.error(res.message || '查询歌手失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('查询歌手失败')
  } finally {
    loading.value = false
  }
}

// 重置查询
const resetQuery = () => {
  queryParams.name = ''
  queryParams.sex = ''
  handleQuery()
}

// 打开添加对话框
const openAddDialog = () => {
  resetForm()
  dialogStatus.value = 'add'
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  singerForm.id = null
  singerForm.name = ''
  singerForm.sex = 1
  singerForm.birth = ''
  singerForm.location = ''
  singerForm.introduction = ''
  singerForm.pic = ''
  avatarImageUrl.value = ''
}

// 处理编辑
const handleEdit = (row) => {
  resetForm()
  dialogStatus.value = 'edit'
  currentSinger.value = row
  
  singerForm.id = row.id
  singerForm.name = row.name
  singerForm.sex = Number(row.sex)
  singerForm.birth = row.birth
  singerForm.location = row.location || ''
  singerForm.introduction = row.introduction || ''
  singerForm.pic = row.pic
  
  dialogVisible.value = true
}

// 处理删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除歌手"${row.name}"吗？此操作不可逆，删除歌手也会影响相关歌曲。`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteSingerService(row.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        fetchSingers()
      }
    } catch (error) {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

// 处理上传头像
const handleUploadAvatar = (row) => {
  currentSinger.value = row
  avatarImageUrl.value = row.pic
  avatarDialogVisible.value = true
}

// 处理头像变更
const handleAvatarChange = (file) => {
  const isJPG = file.raw.type === 'image/jpeg'
  const isPNG = file.raw.type === 'image/png'
  const isLt2M = file.raw.size / 1024 / 1024 < 2
  
  if (!isJPG && !isPNG) {
    ElMessage.error('上传头像图片只能是JPG或PNG格式!')
    return
  }
  if (!isLt2M) {
    ElMessage.error('上传头像图片大小不能超过2MB!')
    return
  }
  
  avatarFile.value = file.raw
  avatarImageUrl.value = URL.createObjectURL(file.raw)
}

// 上传头像文件
const uploadAvatarFile = () => {
  // 由表单提交时统一处理，这里不做实际上传
}

// 提交表单
const submitForm = async () => {
  singerFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogStatus.value === 'add') {
          // 添加新歌手
          const res = await addSingerService(singerForm)
          if (res.code === 200) {
            ElMessage.success('添加成功')
            dialogVisible.value = false
            fetchSingers()
            
            // 如果有头像文件，在添加成功后上传头像
            if (avatarFile.value && res.data && res.data.id) {
              await uploadSingerAvatarService(res.data.id, avatarFile.value)
            }
          }
        } else {
          // 更新歌手信息
          const res = await updateSingerService(singerForm)
          if (res.code === 200) {
            ElMessage.success('更新成功')
            dialogVisible.value = false
            fetchSingers()
          }
        }
      } catch (error) {
        ElMessage.error('操作失败')
        console.error(error)
      }
    } else {
      return false
    }
  })
}

// 提交头像上传
const submitAvatarUpload = async () => {
  if (!avatarFile.value) {
    ElMessage.warning('请选择头像图片')
    return
  }
  
  try {
    const res = await uploadSingerAvatarService(currentSinger.value.id, avatarFile.value)
    if (res.code === 200) {
      ElMessage.success('头像更新成功')
      avatarDialogVisible.value = false
      fetchSingers()
    }
  } catch (error) {
    ElMessage.error('头像更新失败')
    console.error(error)
  }
}

// 获取性别标签类型
const getSexTagType = (sex) => {
  switch (Number(sex)) {
    case 1: return 'primary' // 男
    case 0: return 'success' // 女
    case 2: return 'warning' // 组合
    default: return 'info' // 未知
  }
}

// 获取性别标签内容
const getSexLabel = (sex) => {
  switch (Number(sex)) {
    case 1: return '男'
    case 0: return '女'
    case 2: return '组合'
    default: return '未知'
  }
}

// 处理分页变化
const handlePaginationChange = ({ page, size }) => {
  pagination.currentPage = page;
  pagination.pageSize = size;
  fetchSingers();
}

onMounted(() => {
  fetchSingers()
})
</script>

<style scoped lang="scss">
.singer-management {
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

.avatar-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  background-color: #f5f7fa;
  border-radius: 50%;
  
  .el-icon {
    font-size: 24px;
    color: #909399;
  }
}

.avatar-uploader {
  .avatar {
    width: 178px;
    height: 178px;
    display: block;
    object-fit: cover;
    border-radius: 50%;
  }
  
  .avatar-uploader-icon {
    width: 178px;
    height: 178px;
    border: 1px dashed #d9d9d9;
    border-radius: 50%;
    font-size: 28px;
    color: #8c939d;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}

.operation-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  .button-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
}
</style> 