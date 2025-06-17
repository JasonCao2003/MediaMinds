<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  getBookListService, 
  getBookByIdService, 
  updateBookService,
  getChapterListService,
  getChapterByIdService,
  addChapterService,
  updateChapterService,
  deleteChapterService
} from '@/api/book.js'

// 图书列表数据
const books = ref([])
const selectedBook = ref(null)
const selectedBookInfo = ref(null) // 保存选中图书的完整信息

// 章节列表数据
const chapters = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref('添加章节')
const formMode = ref('add') // 'add' 或 'edit'

// 表单数据
const formData = ref({
  id: null,
  bookId: null,
  chapterNumber: 1,
  chapterTitle: '',
  contentPath: '',
  wordCount: 0
})

// 表单引用
const formRef = ref(null)

// 表单规则
const rules = reactive({
  chapterNumber: [{ required: true, message: '请输入章节序号', trigger: 'blur' }],
  chapterTitle: [{ required: true, message: '请输入章节标题', trigger: 'blur' }],
  contentPath: [{ required: true, message: '请输入内容路径', trigger: 'blur' }]
})

// 获取图书列表
const fetchBooks = async () => {
  try {
    const response = await getBookListService(1, 999) // 获取所有图书用于选择
    if (response.code === 200) {
      books.value = response.data.records || []
      
      // 如果有书籍，默认选择第一本
      if (books.value.length > 0 && !selectedBook.value) {
        selectBook(books.value[0])
      }
    }
  } catch (error) {
    ElMessage.error('获取图书列表失败')
    console.error(error)
  }
}

// 选择图书
const selectBook = (book) => {
  selectedBook.value = book.id
  selectedBookInfo.value = book
  handleBookChange()
}

// 获取章节列表
const fetchChapters = async () => {
  if (!selectedBook.value) {
    chapters.value = []
    total.value = 0
    return
  }
  
  loading.value = true
  try {
    const response = await getChapterListService(
      selectedBook.value, 
      currentPage.value, 
      pageSize.value
    )
    
    if (response.code === 200) {
      chapters.value = response.data.records || []
      total.value = response.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取章节列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 图书选择改变
const handleBookChange = () => {
  currentPage.value = 1
  // 更新选中的图书信息
  if (selectedBook.value) {
    const book = books.value.find(b => b.id === selectedBook.value)
    if (book) {
      selectedBookInfo.value = book
    }
  } else {
    selectedBookInfo.value = null
  }
  fetchChapters()
}

// 添加或编辑章节
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let response
        
        if (formMode.value === 'add') {
          response = await addChapterService(formData.value)
        } else {
          response = await updateChapterService(formData.value)
        }
        
        if (response.code === 200) {
          ElMessage.success(formMode.value === 'add' ? '添加成功' : '修改成功')
          dialogVisible.value = false
          fetchChapters()
          
          // 如果是添加章节，更新图书的章节数
          if (formMode.value === 'add') {
            updateBookChapterCount()
          }
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

// 更新图书章节数
const updateBookChapterCount = async () => {
  try {
    const bookResponse = await getBookByIdService(selectedBook.value)
    if (bookResponse.code === 200) {
      const book = bookResponse.data
      book.chapterCount = (book.chapterCount || 0) + 1
      await updateBookService(book)
    }
  } catch (error) {
    console.error('更新图书章节数失败', error)
  }
}

// 打开添加对话框
const handleAdd = () => {
  if (!selectedBook.value) {
    ElMessage.warning('请先选择图书')
    return
  }
  
  formMode.value = 'add'
  dialogTitle.value = '添加章节'
  formData.value = {
    id: null,
    bookId: selectedBook.value,
    chapterNumber: chapters.value.length + 1,
    chapterTitle: '',
    contentPath: '',
    wordCount: 0
  }
  dialogVisible.value = true
}

// 打开编辑对话框
const handleEdit = (row) => {
  formMode.value = 'edit'
  dialogTitle.value = '编辑章节'
  formData.value = { ...row }
  dialogVisible.value = true
}

// 删除章节
const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个章节吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await deleteChapterService(id)
    if (response.code === 200) {
      ElMessage.success('删除成功')
      fetchChapters()
      
      // 更新图书章节数
      try {
        const bookResponse = await getBookByIdService(selectedBook.value)
        if (bookResponse.code === 200) {
          const book = bookResponse.data
          if (book.chapterCount > 0) {
            book.chapterCount = book.chapterCount - 1
            await updateBookService(book)
          }
        }
      } catch (error) {
        console.error('更新图书章节数失败', error)
      }
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

// 页码改变
const handlePageChange = (page) => {
  currentPage.value = page
  fetchChapters()
}

// 每页条数改变
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchChapters()
}

onMounted(() => {
  fetchBooks()
})
</script>

<template>
  <div class="chapter-manage">
    <div class="page-header">
      <h2>章节管理</h2>
    </div>
    
    <!-- 图书选择 -->
    <el-card class="book-select-card">
      <div class="book-select-container">
        <el-select
          v-model="selectedBook"
          placeholder="请选择图书"
          filterable
          style="width: 300px"
          @change="handleBookChange"
        >
          <el-option
            v-for="book in books"
            :key="book.id"
            :label="book.bookName"
            :value="book.id"
          />
        </el-select>
        
        <el-button type="primary" @click="handleAdd" :disabled="!selectedBook">添加章节</el-button>
      </div>
      
      <!-- 显示选中图书的信息 -->
      <div v-if="selectedBookInfo" class="selected-book-info">
        <div class="book-info-header">
          <h3>{{ selectedBookInfo.bookName }}</h3>
          <span class="chapter-count">章节数: {{ selectedBookInfo.chapterCount || 0 }}</span>
        </div>
        <div class="book-info-content">
          <div class="book-cover" v-if="selectedBookInfo.bookImg">
            <el-image 
              :src="selectedBookInfo.bookImg" 
              fit="cover"
              :preview-src-list="selectedBookInfo.bookImg ? [selectedBookInfo.bookImg] : []"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
          </div>
          <div class="book-details">
            <p v-if="selectedBookInfo.bookAuthor"><strong>作者:</strong> {{ selectedBookInfo.bookAuthor }}</p>
            <p v-if="selectedBookInfo.typeId"><strong>类型:</strong> {{ selectedBookInfo.typeId }}</p>
            <p v-if="selectedBookInfo.bookDetails"><strong>简介:</strong> {{ selectedBookInfo.bookDetails }}</p>
            <p><strong>创建时间:</strong> {{ selectedBookInfo.createTime ? new Date(selectedBookInfo.createTime).toLocaleString() : '-' }}</p>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 章节列表 -->
    <el-card class="chapter-table" v-loading="loading">
      <el-empty v-if="!selectedBook" description="请先选择图书" />
      
      <template v-else>
        <el-alert
          v-if="selectedBookInfo && selectedBookInfo.chapterCount === 0"
          title="该书籍暂无章节，请添加章节"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px;"
        />
        
        <el-table
          :data="chapters"
          border
          style="width: 100%"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="chapterNumber" label="章节序号" width="100" />
          <el-table-column prop="chapterTitle" label="章节标题" min-width="200" />
          <el-table-column prop="contentPath" label="内容路径" min-width="200" />
          <el-table-column prop="wordCount" label="字数" width="100" />
          <el-table-column prop="createTime" label="创建时间" width="180">
            <template #default="{ row }">
              {{ row.createTime ? new Date(row.createTime).toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button-group>
                <el-button type="primary" @click="handleEdit(row)" link>编辑</el-button>
                <el-button type="danger" @click="handleDelete(row.id)" link>删除</el-button>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </template>
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
        <el-form-item label="章节序号" prop="chapterNumber">
          <el-input-number v-model="formData.chapterNumber" :min="1" />
        </el-form-item>
        <el-form-item label="章节标题" prop="chapterTitle">
          <el-input v-model="formData.chapterTitle" />
        </el-form-item>
        <el-form-item label="内容路径" prop="contentPath">
          <el-input v-model="formData.contentPath" />
        </el-form-item>
        <el-form-item label="字数" prop="wordCount">
          <el-input-number v-model="formData.wordCount" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.chapter-manage {
  padding: 20px;
  
  .page-header {
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
  }
  
  .book-select-card {
    margin-bottom: 20px;
    
    .book-select-container {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .selected-book-info {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ebeef5;
      
      .book-info-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        
        h3 {
          margin: 0;
          font-size: 18px;
          color: #303133;
        }
        
        .chapter-count {
          padding: 2px 8px;
          background-color: #f0f9eb;
          color: #67c23a;
          border-radius: 4px;
          font-size: 14px;
        }
      }
      
      .book-info-content {
        display: flex;
        gap: 20px;
        
        .book-cover {
          width: 120px;
          height: 160px;
          flex-shrink: 0;
          
          .el-image {
            width: 100%;
            height: 100%;
            border-radius: 4px;
          }
          
          .image-error {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f7fa;
            color: #909399;
          }
        }
        
        .book-details {
          flex: 1;
          
          p {
            margin: 8px 0;
            color: #606266;
            line-height: 1.5;
            
            &:first-child {
              margin-top: 0;
            }
          }
        }
      }
    }
  }
  
  .chapter-table {
    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }
}
</style> 