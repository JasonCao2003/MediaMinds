<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  getTypeListService, 
  getTypeByIdService, 
  addTypeService, 
  updateTypeService, 
  deleteTypeService 
} from '@/api/book.js'

// 图书类型列表数据
const bookTypes = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref('添加图书类型')
const formMode = ref('add') // 'add' 或 'edit'

// 表单数据
const formData = ref({
  id: null,
  typeName: ''
})

// 表单引用
const formRef = ref(null)

// 表单规则
const rules = reactive({
  typeName: [{ required: true, message: '请输入图书类型名称', trigger: 'blur' }]
})

// 获取图书类型列表
const fetchBookTypes = async () => {
  loading.value = true
  try {
    const response = await getTypeListService(currentPage.value, pageSize.value)
    if (response.code === 200) {
      bookTypes.value = response.data.records || []
      total.value = response.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取图书类型列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 添加或编辑图书类型
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let response
        
        if (formMode.value === 'add') {
          response = await addTypeService(formData.value)
        } else {
          response = await updateTypeService(formData.value)
        }
        
        if (response.code === 200) {
          ElMessage.success(formMode.value === 'add' ? '添加成功' : '修改成功')
          dialogVisible.value = false
          fetchBookTypes()
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
  dialogTitle.value = '添加图书类型'
  formData.value = {
    id: null,
    typeName: ''
  }
  dialogVisible.value = true
}

// 打开编辑对话框
const handleEdit = (row) => {
  formMode.value = 'edit'
  dialogTitle.value = '编辑图书类型'
  formData.value = { ...row }
  dialogVisible.value = true
}

// 删除图书类型
const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个图书类型吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await deleteTypeService(id)
    if (response.code === 200) {
      ElMessage.success('删除成功')
      fetchBookTypes()
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
  fetchBookTypes()
}

// 每页条数改变
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchBookTypes()
}

onMounted(() => {
  fetchBookTypes()
})
</script>

<template>
  <div class="book-type-manage">
    <div class="page-header">
      <h2>图书类型管理</h2>
      <el-button type="primary" @click="handleAdd">添加图书类型</el-button>
    </div>
    
    <!-- 图书类型列表 -->
    <el-card class="type-table" v-loading="loading">
      <el-table
        :data="bookTypes"
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="typeName" label="类型名称" min-width="150" />
        <el-table-column prop="createTime" label="创建时间" width="180">
          <template #default="{ row }">
            {{ row.createTime ? new Date(row.createTime).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="180">
          <template #default="{ row }">
            {{ row.updateTime ? new Date(row.updateTime).toLocaleString() : '-' }}
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
        <el-form-item label="类型名称" prop="typeName">
          <el-input v-model="formData.typeName" />
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
.book-type-manage {
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
  
  .type-table {
    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }
}
</style> 