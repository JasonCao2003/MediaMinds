<template>
  <div class="song-management">
    <div class="page-header">
      <h2>歌曲管理</h2>
      <p class="sub-title">管理所有歌曲资源</p>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <span>歌曲搜索</span>
          <el-button type="primary" @click="openAddDialog" icon="Plus">添加新歌曲</el-button>
        </div>
      </template>
      
      <el-form :model="queryParams" inline>
        <el-form-item label="歌曲名称">
          <el-input v-model="queryParams.name" placeholder="请输入歌曲名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="歌手">
          <el-select v-model="queryParams.singerId" placeholder="请选择歌手" clearable>
            <el-option
              v-for="singer in singers"
              :key="singer.id"
              :label="singer.name"
              :value="singer.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery" icon="Search">查询</el-button>
          <el-button @click="resetQuery" icon="RefreshRight">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 歌曲列表 -->
    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>歌曲列表</span>
          <div>
            <el-button type="success" icon="Upload" @click="openBatchUploadDialog">批量导入</el-button>
            <el-button type="info" icon="Download">导出数据</el-button>
          </div>
        </div>
      </template>

      <el-table 
        :data="songs" 
        style="width: 100%" 
        border 
        stripe 
        v-loading="loading"
        height="550"
        :default-sort="{ prop: 'createTime', order: 'descending' }"
      >
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column type="index" width="50" label="序号"></el-table-column>
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.pic" 
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px;"
            >
              <template #error>
                <div class="image-placeholder">
                  <el-icon><el-icon-headset /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="歌曲名称" sortable show-overflow-tooltip min-width="120"></el-table-column>
        <el-table-column label="歌手" sortable min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getSingerName(row.singerId) }}
          </template>
        </el-table-column>
        <el-table-column prop="introduction" label="简介" show-overflow-tooltip min-width="200"></el-table-column>
        <el-table-column prop="createTime" label="上传时间" sortable width="160" show-overflow-tooltip></el-table-column>
        <el-table-column prop="updateTime" label="更新时间" sortable width="160" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="operation-buttons">
              <div class="button-row">
                <el-button type="primary" size="small" @click="handleEdit(row)" icon="Edit">编辑</el-button>
                <el-button type="danger" size="small" @click="handleDelete(row)" icon="Delete">删除</el-button>
              </div>
              <div class="button-row">
                <el-button type="success" size="small" @click="handleUploadCover(row)" icon="PictureFilled">更新封面</el-button>
                <el-button type="warning" size="small" @click="handleUploadSong(row)" icon="Headset">更新音频</el-button>
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

    <!-- 添加/编辑歌曲对话框 -->
    <el-dialog
      :title="dialogStatus === 'add' ? '添加新歌曲' : '编辑歌曲'"
      v-model="dialogVisible"
      width="600px"
    >
      <el-form
        ref="songFormRef"
        :model="songForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="歌曲名称" prop="name">
          <el-input v-model="songForm.name" placeholder="请输入歌曲名称"></el-input>
        </el-form-item>
        <el-form-item label="歌手" prop="singerId">
          <el-select v-model="songForm.singerId" placeholder="请选择歌手" style="width: 100%">
            <el-option
              v-for="singer in singers"
              :key="singer.id"
              :label="singer.name"
              :value="singer.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="简介" prop="introduction">
          <el-input
            v-model="songForm.introduction"
            type="textarea"
            rows="3"
            placeholder="请输入歌曲简介"
          ></el-input>
        </el-form-item>
        <el-form-item label="歌曲文件" prop="file" v-if="dialogStatus === 'add'">
          <el-upload
            class="upload-demo"
            action="#"
            :http-request="uploadSongFile"
            :limit="1"
            :on-exceed="handleExceed"
            :file-list="songFileList"
            :on-change="handleSongFileChange"
            :auto-upload="false"
            :on-remove="handleRemoveSongFile"
          >
            <template #trigger>
              <el-button type="primary">选择文件</el-button>
            </template>
            <template #tip>
              <div class="el-upload__tip">支持mp3格式，且不超过50MB</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="歌曲封面" prop="pic" v-if="dialogStatus === 'add'">
          <el-upload
            class="avatar-uploader"
            action="#"
            :http-request="uploadCoverFile"
            :show-file-list="false"
            :on-change="handleCoverChange"
            :auto-upload="false"
          >
            <img v-if="coverImageUrl" :src="coverImageUrl" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><plus /></el-icon>
          </el-upload>
          <div class="el-upload__tip">请上传歌曲封面图片，支持jpg/png格式</div>
        </el-form-item>
        <el-form-item label="歌词" prop="lyric">
          <el-input
            v-model="songForm.lyric"
            type="textarea"
            rows="5"
            placeholder="请输入歌词，以[时间]歌词内容的格式"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 上传封面对话框 -->
    <el-dialog title="更新封面" v-model="coverDialogVisible" width="400px">
      <el-upload
        class="avatar-uploader"
        action="#"
        :http-request="uploadCoverFile"
        :show-file-list="false"
        :on-change="handleCoverChange"
        :auto-upload="false"
      >
        <img v-if="coverImageUrl" :src="coverImageUrl" class="avatar" />
        <el-icon v-else class="avatar-uploader-icon"><plus /></el-icon>
      </el-upload>
      <div class="el-upload__tip">请上传歌曲封面图片，支持jpg/png格式</div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="coverDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCoverUpload">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 上传音频对话框 -->
    <el-dialog title="更新音频" v-model="songFileDialogVisible" width="500px">
      <el-upload
        class="upload-demo"
        action="#"
        :http-request="uploadSongFile"
        :limit="1"
        :on-exceed="handleExceed"
        :file-list="songFileList"
        :on-change="handleSongFileChange"
        :auto-upload="false"
        :on-remove="handleRemoveSongFile"
      >
        <template #trigger>
          <el-button type="primary">选择文件</el-button>
        </template>
        <template #tip>
          <div class="el-upload__tip">支持mp3格式，且不超过50MB</div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="songFileDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitSongFileUpload">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 批量上传对话框 -->
    <el-dialog title="批量导入歌曲" v-model="batchUploadDialogVisible" width="500px">
      <p>请先下载模板，填写后上传：</p>
      <el-button type="primary" icon="Download" style="margin-bottom: 20px">下载模板</el-button>
      <el-upload
        class="upload-demo"
        action="#"
        :auto-upload="false"
        :limit="1"
        :on-change="handleBatchFileChange"
        :file-list="batchFileList"
      >
        <template #trigger>
          <el-button type="primary">选择文件</el-button>
        </template>
        <template #tip>
          <div class="el-upload__tip">请上传Excel文件(.xlsx格式)</div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchUploadDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitBatchUpload">确定</el-button>
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
  getAllSongsService, 
  getSongByNameService,
  getSongsBySingerNameService,
  getSongsBySingerIdService,
  getAllSingersService,
  addSongService,
  updateSongService,
  deleteSongService,
  uploadSongFileService,
  uploadSongCoverService
} from '@/api/music.js'

// 歌曲列表
const songs = ref([])
// 歌手列表
const singers = ref([])
// 加载状态
const loading = ref(false)

// 查询参数
const queryParams = reactive({
  name: '',
  singerId: ''  // 使用空字符串作为默认值
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
const coverDialogVisible = ref(false)
const songFileDialogVisible = ref(false)
const batchUploadDialogVisible = ref(false)

// 表单引用
const songFormRef = ref(null)

// 歌曲表单数据
const songForm = reactive({
  id: null,
  name: '',
  singerId: '',
  introduction: '',
  lyric: '',
  pic: '',
  url: ''
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入歌曲名称', trigger: 'blur' }],
  singerId: [{ required: true, message: '请选择歌手', trigger: 'change' }]
}

// 文件列表
const songFileList = ref([])
const coverImageUrl = ref('')
const batchFileList = ref([])

// 当前编辑的歌曲
const currentSong = ref(null)
const songFile = ref(null)
const coverFile = ref(null)

// 获取所有歌曲
const fetchSongs = async () => {
  loading.value = true;
  try {
    const params = {
      pageNum: pagination.currentPage,
      pageSize: pagination.pageSize
    };
    const res = await getAllSongsService(params);
    if (res.code === 200) {
      if (res.data && res.data.records) {
        songs.value = res.data.records || [];
        pagination.total = res.data.total || 0;
      } else if (Array.isArray(res.data)) {
        songs.value = res.data;
        pagination.total = res.data.length;
      } else {
        songs.value = [];
        pagination.total = 0;
        console.warn('获取歌曲数据格式不正确:', res.data);
      }
    } else {
      songs.value = [];
      pagination.total = 0;
      ElMessage.error(res.message || '获取歌曲失败');
    }
  } catch (error) {
    songs.value = [];
    pagination.total = 0;
    console.error('获取歌曲失败', error);
    ElMessage.error('获取歌曲失败');
  } finally {
    loading.value = false;
  }
}

// 获取所有歌手
const fetchSingers = async () => {
  try {
    const params = {
      pageNum: 1,
      pageSize: 1000 // 获取足够多的歌手，确保能够显示所有歌手名称
    }
    const res = await getAllSingersService(params)
    if (res.code === 200 && res.data) {
      // 确保获取到的歌手数据是一个数组
      if (res.data.records && Array.isArray(res.data.records)) {
        singers.value = res.data.records;
      } else if (Array.isArray(res.data)) {
        singers.value = res.data;
      } else {
        console.error('获取到的歌手数据格式不正确:', res.data);
        singers.value = []; // 设置为空数组以避免后续错误
      }
    } else {
      singers.value = []; // 如果请求失败，设置为空数组
    }
  } catch (error) {
    console.error('获取歌手失败', error);
    singers.value = []; // 发生错误时，设置为空数组
  }
}

// 处理查询
const handleQuery = () => {
  // 重置为第一页
  pagination.currentPage = 1;
  // 执行带筛选条件的查询
  fetchFilteredSongs();
}

// 根据筛选条件获取歌曲
const fetchFilteredSongs = async () => {
  loading.value = true;
  try {
    let res;
    const params = {
      pageNum: pagination.currentPage,
      pageSize: pagination.pageSize
    };
    
    if (queryParams.name) {
      res = await getSongByNameService(queryParams.name, params);
    } else if (queryParams.singerId && queryParams.singerId !== '') {
      console.log('根据歌手ID查询:', queryParams.singerId, params);
      try {
        res = await getSongsBySingerIdService(queryParams.singerId, params);
      } catch (error) {
        console.error('调用getSongsBySingerIdService失败:', error);
        // 如果特定API调用失败，尝试回退到获取所有歌曲
        res = await getAllSongsService(params);
      }
    } else {
      res = await getAllSongsService(params);
    }
    
    if (res.code === 200) {
      if (res.data && res.data.records) {
        songs.value = res.data.records || [];
        pagination.total = res.data.total || 0;
      } else if (Array.isArray(res.data)) {
        songs.value = res.data;
        pagination.total = res.data.length;
      } else {
        songs.value = [];
        pagination.total = 0;
        console.warn('获取歌曲数据格式不正确:', res.data);
      }
    } else {
      songs.value = [];
      pagination.total = 0;
      ElMessage.error(res.message || '查询歌曲失败');
    }
  } catch (error) {
    songs.value = [];
    pagination.total = 0;
    console.error('查询歌曲失败', error);
    ElMessage.error('查询歌曲失败');
  } finally {
    loading.value = false;
  }
}

// 重置查询
const resetQuery = () => {
  queryParams.name = '';
  queryParams.singerId = '';  // 确保设置为空字符串而不是undefined
  handleQuery();
}

// 打开添加对话框
const openAddDialog = () => {
  resetForm()
  dialogStatus.value = 'add'
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  songForm.id = null
  songForm.name = ''
  songForm.singerId = ''
  songForm.introduction = ''
  songForm.lyric = ''
  songForm.pic = ''
  songForm.url = ''
  coverImageUrl.value = ''
  songFileList.value = []
}

// 处理编辑
const handleEdit = (row) => {
  resetForm()
  dialogStatus.value = 'edit'
  currentSong.value = row
  
  songForm.id = row.id
  songForm.name = row.name
  songForm.singerId = row.singerId
  songForm.introduction = row.introduction || ''
  songForm.lyric = row.lyric || ''
  songForm.pic = row.pic
  songForm.url = row.url
  
  dialogVisible.value = true
}

// 处理删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除歌曲《${row.name}》吗？此操作不可逆`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteSongService(row.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        fetchFilteredSongs()
      }
    } catch (error) {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

// 处理上传封面
const handleUploadCover = (row) => {
  currentSong.value = row
  coverImageUrl.value = row.pic
  coverDialogVisible.value = true
}

// 处理上传歌曲文件
const handleUploadSong = (row) => {
  currentSong.value = row
  songFileList.value = []
  songFileDialogVisible.value = true
}

// 处理封面变更
const handleCoverChange = (file) => {
  const isJPG = file.raw.type === 'image/jpeg'
  const isPNG = file.raw.type === 'image/png'
  const isLt2M = file.raw.size / 1024 / 1024 < 2
  
  if (!isJPG && !isPNG) {
    ElMessage.error('上传封面图片只能是JPG或PNG格式!')
    return
  }
  if (!isLt2M) {
    ElMessage.error('上传封面图片大小不能超过2MB!')
    return
  }
  
  coverFile.value = file.raw
  coverImageUrl.value = URL.createObjectURL(file.raw)
}

// 处理歌曲文件变更
const handleSongFileChange = (file) => {
  const isMP3 = file.raw.type === 'audio/mp3' || file.raw.name.endsWith('.mp3')
  const isLt50M = file.raw.size / 1024 / 1024 < 50
  
  if (!isMP3) {
    ElMessage.error('上传歌曲只能是MP3格式!')
    songFileList.value = []
    return
  }
  if (!isLt50M) {
    ElMessage.error('上传歌曲大小不能超过50MB!')
    songFileList.value = []
    return
  }
  
  songFile.value = file.raw
}

// 处理批量文件变更
const handleBatchFileChange = (file) => {
  const isXLSX = file.raw.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.raw.name.endsWith('.xlsx')
  
  if (!isXLSX) {
    ElMessage.error('只能上传xlsx格式的Excel文件!')
    batchFileList.value = []
    return
  }
  
  // 保存批量上传文件
  // 实际应用中这里需要处理批量上传文件
}

// 处理超出数量限制
const handleExceed = () => {
  ElMessage.warning('最多只能上传1个文件')
}

// 处理移除歌曲文件
const handleRemoveSongFile = () => {
  songFile.value = null
}

// 上传歌曲文件
const uploadSongFile = () => {
  // 由表单提交时统一处理，这里不做实际上传
}

// 上传封面文件
const uploadCoverFile = () => {
  // 由表单提交时统一处理，这里不做实际上传
}

// 提交表单
const submitForm = async () => {
  songFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogStatus.value === 'add') {
          // 添加新歌曲
          if (!songFile.value) {
            ElMessage.warning('请选择歌曲文件')
            return
          }
          
          const res = await addSongService(songForm, songFile.value)
          if (res.code === 200) {
            ElMessage.success('添加成功')
            dialogVisible.value = false
            resetQuery()
          }
        } else {
          // 更新歌曲信息
          const res = await updateSongService(songForm.id, songForm)
          if (res.code === 200) {
            ElMessage.success('更新成功')
            dialogVisible.value = false
            fetchFilteredSongs()
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

// 提交封面上传
const submitCoverUpload = async () => {
  if (!coverFile.value) {
    ElMessage.warning('请选择封面图片')
    return
  }
  
  try {
    const res = await uploadSongCoverService(currentSong.value.id, coverFile.value)
    if (res.code === 200) {
      ElMessage.success('封面更新成功')
      coverDialogVisible.value = false
      fetchFilteredSongs()
    }
  } catch (error) {
    ElMessage.error('封面更新失败')
    console.error(error)
  }
}

// 提交歌曲文件上传
const submitSongFileUpload = async () => {
  if (!songFile.value) {
    ElMessage.warning('请选择歌曲文件')
    return
  }
  
  try {
    const res = await uploadSongFileService(currentSong.value.id, songFile.value)
    if (res.code === 200) {
      ElMessage.success('歌曲文件更新成功')
      songFileDialogVisible.value = false
      fetchFilteredSongs()
    }
  } catch (error) {
    ElMessage.error('歌曲文件更新失败')
    console.error(error)
  }
}

// 提交批量上传
const submitBatchUpload = () => {
  ElMessage.info('批量上传功能尚未实现')
  batchUploadDialogVisible.value = false
}

// 打开批量上传对话框
const openBatchUploadDialog = () => {
  batchFileList.value = []
  batchUploadDialogVisible.value = true
}

// 获取歌手名称
const getSingerName = (singerId) => {
  if (!singers.value || !Array.isArray(singers.value)) {
    return '未知歌手';
  }
  
  // 确保ID比较时进行类型转换
  const id = Number(singerId);
  const singer = singers.value.find(item => item && Number(item.id) === id);
  return singer ? singer.name : '未知歌手';
}

// 处理分页变化
const handlePaginationChange = ({ page, size }) => {
  pagination.currentPage = page;
  pagination.pageSize = size;
  fetchFilteredSongs();
}

// 初始化数据
const initData = () => {
  // 获取歌手列表 - 通常比较少，可以一次性获取
  fetchSingers()
  // 获取第一页歌曲数据
  fetchFilteredSongs()
}

onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss">
.song-management {
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
  position: sticky;
  top: 0;
  z-index: 10;
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
  padding: 10px 0;
  background-color: #fff;
  position: sticky;
  bottom: 0;
  z-index: 10;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.image-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  background-color: #f5f7fa;
  border-radius: 4px;
  
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
  }
  
  .avatar-uploader-icon {
    width: 178px;
    height: 178px;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
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