<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  getBookListService, 
  getBookByIdService, 
  addBookService, 
  updateBookService, 
  deleteBookService, 
  updateCoverService, 
  searchBookService,
  getAllTypesService
} from '@/api/book.js'

// 图书列表数据
const books = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 图书类型数据
const bookTypes = ref([])

// 搜索关键词
const searchKeyword = ref('')

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref('添加图书')
const formMode = ref('add') // 'add' 或 'edit'

// 封面上传对话框控制
const coverDialogVisible = ref(false)
const currentBookId = ref(null)
const coverFile = ref(null)
const coverPreviewUrl = ref('')

// 表单数据
const formData = ref({
  id: null,
  typeId: '',
  bookName: '',
  bookAuthor: '',
  bookImg: '',
  bookDetails: '',
  chapterCount: 0
})

// 表单引用
const formRef = ref(null)

// 表单规则
const rules = reactive({
  typeId: [{ required: true, message: '请选择图书类型', trigger: 'change' }],
  bookName: [{ required: true, message: '请输入图书名称', trigger: 'blur' }],
  bookAuthor: [{ required: true, message: '请输入作者名称', trigger: 'blur' }],
  bookDetails: [{ required: true, message: '请输入图书描述', trigger: 'blur' }]
})

// 获取图书列表
const fetchBooks = async () => {
  loading.value = true
  try {
    let response
    if (searchKeyword.value) {
      response = await searchBookService(searchKeyword.value, currentPage.value, pageSize.value)
    } else {
      response = await getBookListService(currentPage.value, pageSize.value)
    }
    
    if (response.code === 200) {
      books.value = response.data.records || []
      total.value = response.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取图书列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 获取图书类型
const fetchBookTypes = async () => {
  try {
    const response = await getAllTypesService()
    if (response.code === 200) {
      bookTypes.value = response.data
    }
  } catch (error) {
    ElMessage.error('获取图书类型失败')
    console.error(error)
  }
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  fetchBooks()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  fetchBooks()
}

// 添加或编辑图书
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let response
        
        if (formMode.value === 'add') {
          response = await addBookService(formData.value)
        } else {
          response = await updateBookService(formData.value)
        }
        
        if (response.code === 200) {
          ElMessage.success(formMode.value === 'add' ? '添加成功' : '修改成功')
          dialogVisible.value = false
          fetchBooks()
        } else {
          ElMessage.error(response.message || (formMode.value === 'add' ? '添加失败' : '修改失败'))
        }
      } catch (error) {
        ElMessage.error(formMode.value === 'add' ? '添加失败' : '修改失败')
        console.error(error)
      }
    }
  })
}

// 打开添加对话框
const handleAdd = () => {
  formMode.value = 'add'
  dialogTitle.value = '添加图书'
  formData.value = {
    id: null,
    typeId: '',
    bookName: '',
    bookAuthor: '',
    bookImg: '',
    bookDetails: '',
    chapterCount: 0
  }
  dialogVisible.value = true
}

// 打开编辑对话框
const handleEdit = (row) => {
  formMode.value = 'edit'
  dialogTitle.value = '编辑图书'
  formData.value = { ...row }
  dialogVisible.value = true
}

// 删除图书
const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这本图书吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await deleteBookService(id)
    if (response.code === 200) {
      ElMessage.success('删除成功')
      fetchBooks()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error(error)
    }
  }
}

// 更新封面
const handleUpdateCover = (row) => {
  // 保存当前操作的图书ID
  currentBookId.value = row.id
  // 显示封面预览（如果有）
  coverPreviewUrl.value = row.bookImg || ''
  // 打开上传对话框
  coverDialogVisible.value = true
}

// 处理文件选择
const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.type.includes('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  
  // 验证文件大小（限制为2MB）
  if (file.size / 1024 / 1024 > 2) {
    ElMessage.error('图片大小不能超过2MB')
    return
  }
  
  // 保存文件对象
  coverFile.value = file
  
  // 创建预览URL
  coverPreviewUrl.value = URL.createObjectURL(file)
}

// 提交封面更新
const submitCoverUpdate = async () => {
  if (!coverFile.value || !currentBookId.value) {
    ElMessage.warning('请先选择图片')
    return
  }
  
  try {
    const response = await updateCoverService(currentBookId.value, coverFile.value)
    
    if (response.code === 200) {
      ElMessage.success('封面更新成功')
      coverDialogVisible.value = false
      // 刷新图书列表
      fetchBooks()
    } else {
      ElMessage.error(response.message || '封面更新失败')
    }
  } catch (error) {
    ElMessage.error('封面更新失败')
    console.error(error)
  }
}

// 取消封面更新
const cancelCoverUpdate = () => {
  coverDialogVisible.value = false
  coverFile.value = null
  coverPreviewUrl.value = ''
}

// 页码改变
const handlePageChange = (page) => {
  currentPage.value = page
  fetchBooks()
}

// 每页条数改变
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchBooks()
}

onMounted(() => {
  fetchBooks()
  fetchBookTypes()
})
</script>

<template>
  <div class="book-manage">
    <div class="page-header">
      <h2>图书管理</h2>
      <el-button type="primary" @click="handleAdd">添加图书</el-button>
    </div>
    
    <!-- 搜索区 -->
    <el-card class="search-card">
      <div class="search-container">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索图书名称或作者"
          clearable
          @keyup.enter="handleSearch"
          style="width: 300px"
        >
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
        
        <el-button @click="resetSearch" plain>重置</el-button>
      </div>
    </el-card>
    
    <!-- 图书列表 -->
    <el-card class="book-table" v-loading="loading">
      <el-table
        :data="books"
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="bookName" label="书名" min-width="150" />
        <el-table-column prop="bookAuthor" label="作者" width="120" />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.bookImg"
              :preview-src-list="row.bookImg ? [row.bookImg] : []"
              fit="cover"
              style="width: 50px; height: 70px"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            {{ bookTypes.find(type => type.id === row.typeId)?.typeName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="chapterCount" label="章节数" width="100" />
        <el-table-column prop="bookDetails" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="180">
          <template #default="{ row }">
            {{ row.createTime ? new Date(row.createTime).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" @click="handleEdit(row)" link>编辑</el-button>
              <el-button type="danger" @click="handleDelete(row.id)" link>删除</el-button>
              <el-button type="warning" @click="handleUpdateCover(row)" link>更新封面</el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="图书类型" prop="typeId">
          <el-select v-model="formData.typeId" placeholder="请选择图书类型">
            <el-option
              v-for="type in bookTypes"
              :key="type.id"
              :label="type.typeName"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="书名" prop="bookName">
          <el-input v-model="formData.bookName" />
        </el-form-item>
        <el-form-item label="作者" prop="bookAuthor">
          <el-input v-model="formData.bookAuthor" />
        </el-form-item>
        <el-form-item label="封面地址" prop="bookImg">
          <el-input v-model="formData.bookImg" />
        </el-form-item>
        <el-form-item label="描述" prop="bookDetails">
          <el-input
            v-model="formData.bookDetails"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 封面上传对话框 -->
    <el-dialog
      v-model="coverDialogVisible"
      title="更新图书封面"
      width="400px"
    >
      <div class="cover-upload-container">
        <div class="cover-preview">
          <el-image
            v-if="coverPreviewUrl"
            :src="coverPreviewUrl"
            fit="cover"
            class="cover-image"
          >
            <template #error>
              <div class="image-error">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-image>
          <div v-else class="upload-placeholder">
            <el-icon><Picture /></el-icon>
            <span>请选择封面图片</span>
          </div>
        </div>
        
        <div class="upload-actions">
          <input
            type="file"
            accept="image/*"
            ref="fileInput"
            style="display: none"
            @change="handleFileChange"
          />
          <el-button type="primary" @click="$refs.fileInput.click()">选择图片</el-button>
          <el-button type="success" :disabled="!coverFile" @click="submitCoverUpdate">上传</el-button>
        </div>
        
        <div class="upload-tips">
          <p>提示：</p>
          <ul>
            <li>请上传JPG、PNG格式的图片</li>
            <li>图片大小不超过2MB</li>
            <li>推荐尺寸为300x400像素</li>
          </ul>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelCoverUpdate">取消</el-button>
          <el-button type="primary" :disabled="!coverFile" @click="submitCoverUpdate">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.book-manage {
  padding: 20px;
  
  .page-header {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
  }
  
  .search-card {
    margin-bottom: 20px;
    
    .search-container {
      display: flex;
      gap: 12px;
      align-items: center;
    }
  }
  
  .book-table {
    .image-error {
      width: 50px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f7fa;
      color: #909399;
    }
  }
  
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
}

:deep(.el-dialog) {
  .el-select {
    width: 100%;
  }
}

.cover-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  
  .cover-preview {
    width: 180px;
    height: 240px;
    margin-bottom: 20px;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    
    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #909399;
      
      .el-icon {
        font-size: 48px;
        margin-bottom: 10px;
      }
    }
  }
  
  .upload-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .upload-tips {
    width: 100%;
    font-size: 12px;
    color: #909399;
    
    p {
      margin-bottom: 5px;
    }
    
    ul {
      padding-left: 20px;
      margin: 0;
      
      li {
        margin-bottom: 3px;
      }
    }
  }
}
</style> 