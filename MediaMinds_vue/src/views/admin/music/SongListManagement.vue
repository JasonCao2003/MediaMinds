<template>
  <div class="songlist-management">
    <div class="page-header">
      <h2>歌单管理</h2>
      <p class="sub-title">管理所有歌单资源</p>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <span>歌单搜索</span>
          <el-button type="primary" @click="openAddDialog" icon="Plus">添加新歌单</el-button>
        </div>
      </template>
      
      <el-form :model="queryParams" inline>
        <el-form-item label="歌单标题">
          <el-input v-model="queryParams.title" placeholder="请输入歌单标题" clearable></el-input>
        </el-form-item>
        <el-form-item label="风格">
          <el-select v-model="queryParams.style" placeholder="请选择风格" clearable>
            <el-option label="乐器" value="乐器"></el-option>
            <el-option label="粤语" value="粤语"></el-option>
            <el-option label="华语" value="华语"></el-option>
            <el-option label="日韩" value="日韩"></el-option>
            <el-option label="欧美" value="欧美"></el-option>
            <el-option label="BGM" value="BGM"></el-option>
            <el-option label="轻音乐" value="轻音乐"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery" icon="Search">查询</el-button>
          <el-button @click="resetQuery" icon="RefreshRight">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 歌单列表 -->
    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>歌单列表</span>
        </div>
      </template>

      <el-table 
        :data="songLists" 
        style="width: 100%" 
        border 
        stripe 
        v-loading="loading"
        height="550">
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
                  <el-icon><el-icon-picture /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="歌单标题" sortable min-width="120"></el-table-column>
        <el-table-column prop="style" label="风格" width="100"></el-table-column>
        <el-table-column prop="introduction" label="简介" show-overflow-tooltip min-width="200"></el-table-column>
        <el-table-column label="推荐" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.recommended"
              @change="(val) => handleRecommendChange(row, val)"
              active-color="#13ce66"
              inactive-color="#ff4949"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="operation-buttons">
              <div class="button-row">
                <el-button type="primary" size="small" @click="handleEdit(row)" icon="Edit">编辑</el-button>
                <el-button type="danger" size="small" @click="handleDelete(row)" icon="Delete">删除</el-button>
              </div>
              <div class="button-row">
                <el-button type="success" size="small" @click="handleUploadCover(row)" icon="PictureFilled">更新封面</el-button>
                <el-button type="info" size="small" @click="handleManageSongs(row)" icon="List">管理歌曲</el-button>
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

    <!-- 添加/编辑歌单对话框 -->
    <el-dialog
      :title="dialogStatus === 'add' ? '添加新歌单' : '编辑歌单'"
      v-model="dialogVisible"
      width="600px"
    >
      <el-form
        ref="songListFormRef"
        :model="songListForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="歌单标题" prop="title">
          <el-input v-model="songListForm.title" placeholder="请输入歌单标题"></el-input>
        </el-form-item>
        <el-form-item label="风格" prop="style">
          <el-select v-model="songListForm.style" placeholder="请选择风格" style="width: 100%">
            <el-option label="流行" value="流行"></el-option>
            <el-option label="摇滚" value="摇滚"></el-option>
            <el-option label="民谣" value="民谣"></el-option>
            <el-option label="电子" value="电子"></el-option>
            <el-option label="说唱" value="说唱"></el-option>
            <el-option label="轻音乐" value="轻音乐"></el-option>
            <el-option label="爵士" value="爵士"></el-option>
            <el-option label="古典" value="古典"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="推荐" prop="recommended">
          <el-switch v-model="songListForm.recommended"></el-switch>
        </el-form-item>
        <el-form-item label="简介" prop="introduction">
          <el-input
            v-model="songListForm.introduction"
            type="textarea"
            rows="4"
            placeholder="请输入歌单简介"
          ></el-input>
        </el-form-item>
        <el-form-item label="封面" prop="pic" v-if="dialogStatus === 'add'">
          <el-upload
            class="cover-uploader"
            action="#"
            :http-request="uploadCoverFile"
            :show-file-list="false"
            :on-change="handleCoverChange"
            :auto-upload="false"
          >
            <img v-if="coverImageUrl" :src="coverImageUrl" class="cover" />
            <el-icon v-else class="cover-uploader-icon"><plus /></el-icon>
          </el-upload>
          <div class="el-upload__tip">请上传歌单封面图片，支持jpg/png格式</div>
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
        class="cover-uploader"
        action="#"
        :http-request="uploadCoverFile"
        :show-file-list="false"
        :on-change="handleCoverChange"
        :auto-upload="false"
      >
        <img v-if="coverImageUrl" :src="coverImageUrl" class="cover" />
        <el-icon v-else class="cover-uploader-icon"><plus /></el-icon>
      </el-upload>
      <div class="el-upload__tip">请上传歌单封面图片，支持jpg/png格式</div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="coverDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCoverUpload">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 管理歌单歌曲对话框 -->
    <el-dialog title="管理歌单歌曲" v-model="songsDialogVisible" width="800px">
      <div v-if="currentSongList" class="song-manager">
        <h3>{{ currentSongList.title }} - 歌曲列表</h3>
        
        <div class="add-song-section">
          <el-input
            v-model="songSearchKeyword"
            placeholder="搜索歌曲添加"
            class="search-input"
            clearable
            @keyup.enter="searchSongs"
          >
            <template #prefix>
              <el-icon><el-icon-search /></el-icon>
            </template>
            <template #append>
              <el-button @click="searchSongs">搜索</el-button>
            </template>
          </el-input>
        </div>

        <!-- 搜索结果 -->
        <div v-if="searchedSongs.length > 0" class="search-results">
          <h4>搜索结果：</h4>
          <el-table :data="searchedSongs" style="width: 100%" border>
            <el-table-column label="封面" width="100">
              <template #default="{ row }">
                <el-image
                  :src="row.pic" 
                  fit="cover"
                  style="width: 60px; height: 60px; border-radius: 4px;"
                >
                  <template #error>
                    <div class="image-placeholder">
                      <el-icon><el-icon-picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="歌曲名称"></el-table-column>
            <el-table-column label="歌手">
              <template #default="{ row }">
                {{ getSingerName(row.singerId) }}
              </template>
            </el-table-column>
            <el-table-column prop="introduction" label="简介" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="addSongToList(row)"
                  :disabled="isSongInList(row.id)"
                >
                  {{ isSongInList(row.id) ? '已添加' : '添加' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 歌单中的歌曲列表 -->
        <div class="songlist-songs">
          <h4>歌单中的歌曲：</h4>
          <el-table :data="songListSongs" style="width: 100%" border v-loading="songsLoading">
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
                      <el-icon><el-icon-picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="歌曲名称"></el-table-column>
            <el-table-column label="歌手">
              <template #default="{ row }">
                {{ getSingerName(row.singerId) }}
              </template>
            </el-table-column>
            <el-table-column prop="introduction" label="简介" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="removeSongFromList(row)">
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-container">
            <admin-pagination
              v-model="songListSongsPagination.currentPage"
              v-model:page-size="songListSongsPagination.pageSize"
              :total="songListSongsPagination.total"
              @change="handleSongListSongsPaginationChange"
            />
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminPagination from '@/components/AdminPagination.vue'
import { 
  getAllSongListsService,
  getSongListByLikeTitleService,
  getSongListByStyleService,
  addSongListService,
  updateSongListService,
  deleteSongListService,
  updateSongListCoverService,
  getAllSongsService,
  getSongByNameService,
  getListSongBySongListIdService,
  addListSongService,
  deleteListSongService,
  getAllSingersService
} from '@/api/music.js'

// 歌单列表
const songLists = ref([])
// 歌手列表
const singers = ref([])
// 加载状态
const loading = ref(false)
const songsLoading = ref(false)

// 查询参数
const queryParams = reactive({
  title: '',
  style: ''
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
const songsDialogVisible = ref(false)

// 表单引用
const songListFormRef = ref(null)

// 歌单表单数据
const songListForm = reactive({
  id: null,
  title: '',
  style: '',
  introduction: '',
  pic: '',
  recommended: false
})

// 表单验证规则
const rules = {
  title: [{ required: true, message: '请输入歌单标题', trigger: 'blur' }],
  style: [{ required: true, message: '请选择风格', trigger: 'change' }]
}

// 封面URL
const coverImageUrl = ref('')

// 当前操作的歌单
const currentSongList = ref(null)
const coverFile = ref(null)

// 歌单歌曲
const songListSongs = ref([])
const searchedSongs = ref([])
const songSearchKeyword = ref('')

// 歌单歌曲分页参数
const songListSongsPagination = reactive({
  currentPage: 1,
  pageSize: 6,
  total: 0
})

// 获取所有歌单
const fetchSongLists = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    const res = await getAllSongListsService(params)
    if (res.code === 200) {
      songLists.value = res.data.records || []
      pagination.total = res.data.total || 0
    } else {
      ElMessage.error(res.message || '获取歌单列表失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取歌单列表失败')
  } finally {
    loading.value = false
  }
}

// 获取所有歌手
const fetchSingers = async () => {
  try {
    const params = {
      pageNum: 1,
      pageSize: 100 // 获取足够多的歌手以显示歌手名称
    }
    const res = await getAllSingersService(params)
    if (res.code === 200 && res.data) {
      singers.value = res.data.records || []
    }
  } catch (error) {
    console.error('获取歌手失败', error)
  }
}

// 处理查询
const handleQuery = async () => {
  loading.value = true
  pagination.currentPage = 1
  try {
    let res
    const params = {
      pageNum: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    if (queryParams.title) {
      res = await getSongListByLikeTitleService(queryParams.title, params)
    } else if (queryParams.style) {
      res = await getSongListByStyleService(queryParams.style, params)
    } else {
      res = await getAllSongListsService(params)
    }
    
    if (res.code === 200) {
      songLists.value = res.data.records || []
      pagination.total = res.data.total || 0
    } else {
      ElMessage.error(res.message || '查询歌单失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('查询歌单失败')
  } finally {
    loading.value = false
  }
}

// 重置查询
const resetQuery = () => {
  queryParams.title = ''
  queryParams.style = ''
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
  songListForm.id = null
  songListForm.title = ''
  songListForm.style = ''
  songListForm.introduction = ''
  songListForm.pic = ''
  songListForm.recommended = false
  coverImageUrl.value = ''
}

// 处理编辑
const handleEdit = (row) => {
  resetForm()
  dialogStatus.value = 'edit'
  currentSongList.value = row
  
  songListForm.id = row.id
  songListForm.title = row.title
  songListForm.style = row.style
  songListForm.introduction = row.introduction || ''
  songListForm.pic = row.pic
  songListForm.recommended = row.recommended || false
  
  dialogVisible.value = true
}

// 处理删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除歌单"${row.title}"吗？此操作不可逆，删除歌单也会删除相关联的歌曲。`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteSongListService(row.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        fetchSongLists()
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
  currentSongList.value = row
  coverImageUrl.value = row.pic
  coverDialogVisible.value = true
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

// 上传封面文件
const uploadCoverFile = () => {
  // 由表单提交时统一处理，这里不做实际上传
}

// 处理推荐状态变更
const handleRecommendChange = async (row, value) => {
  try {
    const updatedSongList = { ...row, recommended: value }
    const res = await updateSongListService(row.id, updatedSongList)
    if (res.code === 200) {
      ElMessage.success(`歌单"${row.title}"${value ? '已添加到推荐' : '已从推荐中移除'}`)
    }
  } catch (error) {
    // 恢复原状态
    row.recommended = !value
    ElMessage.error('操作失败')
    console.error(error)
  }
}

// 处理管理歌单歌曲
const handleManageSongs = async (row) => {
  currentSongList.value = row
  songsDialogVisible.value = true
  songSearchKeyword.value = ''
  searchedSongs.value = []
  
  // 重置歌曲分页
  songListSongsPagination.currentPage = 1
  songListSongsPagination.pageSize = 6
  songListSongsPagination.total = 0
  
  // 获取歌单中的歌曲
  await fetchSongListSongs(row.id)
}

// 获取歌单中的歌曲
const fetchSongListSongs = async (songListId) => {
  songsLoading.value = true
  try {
    const params = {
      pageNum: songListSongsPagination.currentPage,
      pageSize: songListSongsPagination.pageSize
    }
    const res = await getListSongBySongListIdService(songListId, params)
    if (res.code === 200) {
      songListSongs.value = res.data.records || []
      // 更新分页信息
      songListSongsPagination.currentPage = res.data.current || 1
      songListSongsPagination.pageSize = res.data.size || 6
      songListSongsPagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取歌单歌曲失败')
    console.error(error)
  } finally {
    songsLoading.value = false
  }
}

// 搜索歌曲
const searchSongs = async () => {
  if (!songSearchKeyword.value) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  
  try {
    const params = {
      pageNum: 1,
      pageSize: 20 // 搜索结果显示20条
    }
    const res = await getSongByNameService(songSearchKeyword.value, params)
    if (res.code === 200) {
      searchedSongs.value = res.data.records || []
    }
  } catch (error) {
    ElMessage.error('搜索歌曲失败')
    console.error(error)
  }
}

// 添加歌曲到歌单
const addSongToList = async (song) => {
  try {
    const listSongData = {
      songId: song.id,
      songListId: currentSongList.value.id
    }
    
    const res = await addListSongService(listSongData)
    if (res.code === 200) {
      ElMessage.success(`歌曲"${song.name}"已添加到歌单`)
      // 刷新歌单歌曲列表，保持当前页
      await fetchSongListSongs(currentSongList.value.id)
    }
  } catch (error) {
    ElMessage.error('添加歌曲失败')
    console.error(error)
  }
}

// 从歌单中移除歌曲
const removeSongFromList = async (song) => {
  try {
    const res = await deleteListSongService(song.id)
    if (res.code === 200) {
      ElMessage.success(`歌曲"${song.name}"已从歌单中移除`)
      
      // 如果当前页没有数据了，并且不是第一页，则返回上一页
      if (songListSongs.value.length === 1 && songListSongsPagination.currentPage > 1) {
        songListSongsPagination.currentPage -= 1
      }
      
      // 刷新歌单歌曲列表
      await fetchSongListSongs(currentSongList.value.id)
    }
  } catch (error) {
    ElMessage.error('移除歌曲失败')
    console.error(error)
  }
}

// 检查歌曲是否已在歌单中
const isSongInList = (songId) => {
  return songListSongs.value.some(song => Number(song.id) === Number(songId))
}

// 提交表单
const submitForm = async () => {
  songListFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogStatus.value === 'add') {
          // 添加新歌单
          const res = await addSongListService(songListForm)
          if (res.code === 200) {
            ElMessage.success('添加成功')
            dialogVisible.value = false
            fetchSongLists()
            
            // 如果有封面文件，在添加成功后上传封面
            if (coverFile.value && res.data && res.data.id) {
              await updateSongListCoverService(res.data.id, coverFile.value)
            }
          }
        } else {
          // 更新歌单信息
          const res = await updateSongListService(songListForm.id, songListForm)
          if (res.code === 200) {
            ElMessage.success('更新成功')
            dialogVisible.value = false
            fetchSongLists()
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
    const res = await updateSongListCoverService(currentSongList.value.id, coverFile.value)
    if (res.code === 200) {
      ElMessage.success('封面更新成功')
      coverDialogVisible.value = false
      fetchSongLists()
    }
  } catch (error) {
    ElMessage.error('封面更新失败')
    console.error(error)
  }
}

// 获取歌手名称
const getSingerName = (singerId) => {
  const singer = singers.value.find(item => item.id === singerId)
  return singer ? singer.name : '未知歌手'
}

// 处理分页变化
const handlePaginationChange = ({ page, size }) => {
  pagination.currentPage = page;
  pagination.pageSize = size;
  fetchSongLists();
}

// 处理歌单歌曲分页变化
const handleSongListSongsPaginationChange = ({ page, size }) => {
  songListSongsPagination.currentPage = page
  songListSongsPagination.pageSize = size
  fetchSongListSongs(currentSongList.value.id)
}

onMounted(() => {
  fetchSongLists()
  fetchSingers()
})
</script>

<style scoped lang="scss">
.songlist-management {
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

.cover-uploader {
  .cover {
    width: 178px;
    height: 178px;
    display: block;
    object-fit: cover;
  }
  
  .cover-uploader-icon {
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

.song-manager {
  h3 {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 18px;
    color: #333;
  }
  
  h4 {
    margin-top: 15px;
    margin-bottom: 10px;
    font-size: 16px;
    color: #666;
  }
  
  .add-song-section {
    margin-bottom: 20px;
  }
  
  .search-input {
    width: 100%;
  }
  
  .search-results {
    margin-bottom: 20px;
  }
  
  .songlist-songs {
    margin-top: 20px;
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