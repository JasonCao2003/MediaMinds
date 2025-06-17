<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  adminGetUserListService, 
  adminUpdateUserRoleService, 
  adminUpdateUserStatusService, 
  adminDeleteUserService,
  adminAddUserService
} from '@/api/user.js'

// 用户数据
const userList = ref([])

// 分页参数
const pagination = ref({
  currentPage: 1,
  pageSize: 8,
  total: 0
})

// 查询参数
const queryParams = ref({
  userName: '',
  email: '',
  role: '',
  status: ''
})

// 加载状态
const loading = ref(false)

// 用户表单对话框
const userDialogVisible = ref(false)
const userForm = ref({
  userName: '',
  email: '',
  password: '',
  role: 'user',
  status: 'active'
})
const userFormRules = {
  userName: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}
const userFormRef = ref(null)

// 用户详情对话框
const userDetailVisible = ref(false)
const currentUser = ref(null)
const userDetailTabs = ref('basic')

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      userName: queryParams.value.userName || undefined,
      email: queryParams.value.email || undefined,
      role: queryParams.value.role || undefined,
      status: queryParams.value.status || undefined,
      currentPage: pagination.value.currentPage,
      pageSize: pagination.value.pageSize
    }
    
    const res = await adminGetUserListService(params)
    console.log('API响应数据:', res)
    
    // 检查响应数据结构
    if (res.code === 200) {
      console.log('用户列表数据:', res.data.list)
      userList.value = res.data.list || []
      pagination.value.total = res.data.total || 0
      
      // 确保从API响应获取正确的当前页值
      if (res.data.currentPage !== undefined) {
        pagination.value.currentPage = parseInt(res.data.currentPage)
        console.log('API返回的当前页码:', res.data.currentPage)
        console.log('设置的当前页码:', pagination.value.currentPage)
      }
      
      pagination.value.pageSize = res.data.pageSize || 8
    } else {
      ElMessage.error(res.message || '获取用户列表失败')
    }
  } catch (error) {
    console.error('获取用户列表出错', error)
    ElMessage.error('获取用户列表出错')
  } finally {
    loading.value = false
  }
}

// 处理分页变化
const handlePaginationChange = ({ page, size }) => {
  pagination.value.currentPage = page
  pagination.value.pageSize = size
  loadData()
}

// 处理查询
const handleQuery = () => {
  pagination.value.currentPage = 1
  loadData()
}

// 重置查询
const resetQuery = () => {
  queryParams.value = {
    userName: '',
    email: '',
    role: '',
    status: ''
  }
  handleQuery()
}

// 打开添加用户对话框
const openAddUserDialog = () => {
  userForm.value = {
    userName: '',
    email: '',
    password: '123456', // 默认密码
    role: 'user',
    status: 'active'
  }
  userDialogVisible.value = true
}

// 提交用户表单
const submitUserForm = async () => {
  if (!userFormRef.value) return
  
  await userFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const res = await adminAddUserService(userForm.value)
        if (res.code === 200) {
          ElMessage.success('添加用户成功')
          userDialogVisible.value = false
          loadData()
        } else {
          ElMessage.error(res.message || '添加用户失败')
        }
      } catch (error) {
        console.error('添加用户出错', error)
        ElMessage.error('添加用户出错')
      }
    }
  })
}

// 修改用户角色
const handleRoleChange = async (row) => {
  try {
    const newRole = row.role === 'admin' ? 'user' : 'admin'
    const confirmText = newRole === 'admin' ? '确定要将该用户升级为管理员吗？' : '确定要将该用户降级为普通用户吗？'
    
    await ElMessageBox.confirm(confirmText, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await adminUpdateUserRoleService(row.userId, newRole)
    if (res.code === 200) {
      ElMessage.success('修改用户角色成功')
      row.role = newRole
    } else {
      ElMessage.error(res.message || '修改用户角色失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('修改用户角色出错', error)
      ElMessage.error('修改用户角色出错')
    }
  }
}

// 修改用户状态
const handleStatusChange = async (row) => {
  try {
    const res = await adminUpdateUserStatusService(row.userId, row.status)
    if (res.code === 200) {
      ElMessage.success('修改用户状态成功')
    } else {
      // 如果失败，恢复原状态
      row.status = row.status === 'active' ? 'inactive' : 'active'
      ElMessage.error(res.message || '修改用户状态失败')
    }
  } catch (error) {
    // 如果出错，恢复原状态
    row.status = row.status === 'active' ? 'inactive' : 'active'
    console.error('修改用户状态出错', error)
    ElMessage.error('修改用户状态出错')
  }
}

// 删除用户
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该用户吗？此操作不可恢复！', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await adminDeleteUserService(row.userId)
    if (res.code === 200) {
      ElMessage.success('删除用户成功')
      loadData()
    } else {
      ElMessage.error(res.message || '删除用户失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户出错', error)
      ElMessage.error('删除用户出错')
    }
  }
}

// 查看用户详情
const handleViewDetail = (row) => {
  currentUser.value = { ...row }
  userDetailVisible.value = true
  userDetailTabs.value = 'basic'
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '未设置'
  
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return dateStr
  }
}

// 格式化状态
const formatStatus = (status) => {
  const statusMap = {
    'active': '正常',
    'inactive': '禁用'
  }
  return statusMap[status] || status
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="user-management">
    <div class="page-header">
      <h2>用户管理</h2>
    </div>

    <!-- 查询表单 -->
    <el-card class="search-card">
      <el-form :model="queryParams" ref="queryForm" :inline="true">
        <el-form-item label="用户名" prop="userName">
          <el-input v-model="queryParams.userName" placeholder="请输入用户名" clearable></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="queryParams.email" placeholder="请输入邮箱" clearable></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="queryParams.role" placeholder="请选择角色" clearable>
            <el-option label="管理员" value="admin"></el-option>
            <el-option label="普通用户" value="user"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
            <el-option label="正常" value="active"></el-option>
            <el-option label="禁用" value="inactive"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery" :loading="loading">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <el-button type="primary" @click="openAddUserDialog">添加用户</el-button>
        </div>
      </template>

      <el-table 
        :data="userList" 
        style="width: 100%" 
        border
        stripe
        v-loading="loading"
        height="550">
        <el-table-column type="index" width="50"></el-table-column>
        <el-table-column prop="userName" label="用户名" min-width="120"></el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180"></el-table-column>
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag type="success" v-if="row.role === 'admin'">管理员</el-tag>
            <el-tag v-else>普通用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              active-value="active"
              inactive-value="inactive"
              @change="() => handleStatusChange(row)"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="150"></el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="operation-buttons">
              <div class="button-row">
                <el-button type="primary" link @click="handleViewDetail(row)">详情</el-button>
                <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
              </div>
              <div class="button-row">
                <el-button type="primary" link @click="handleRoleChange(row)">
                  {{ row.role === 'admin' ? '降为普通用户' : '升为管理员' }}
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[8, 16, 32, 64]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="(size) => handlePaginationChange({ page: pagination.currentPage, size })"
          @current-change="(page) => handlePaginationChange({ page, size: pagination.pageSize })"
          background
        />
        <div class="page-info">
          当前页: {{ pagination.currentPage }}，每页: {{ pagination.pageSize }}，总计: {{ pagination.total }}
        </div>
      </div>
    </el-card>

    <!-- 添加用户对话框 -->
    <el-dialog
      v-model="userDialogVisible"
      title="添加用户"
      width="500px"
      append-to-body
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="userName">
          <el-input v-model="userForm.userName" placeholder="请输入用户名"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="userForm.password" placeholder="请输入密码，默认为123456" show-password></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin"></el-option>
            <el-option label="普通用户" value="user"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" placeholder="请选择状态">
            <el-option label="正常" value="active"></el-option>
            <el-option label="禁用" value="inactive"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUserForm">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="userDetailVisible"
      title="用户详情"
      width="700px"
      destroy-on-close
    >
      <template v-if="currentUser">
        <el-tabs v-model="userDetailTabs">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <div class="user-avatar-container">
              <el-avatar :size="100" :src="currentUser.avatar || '/default-avatar.png'"></el-avatar>
              <h3>{{ currentUser.nickName || currentUser.userName }}</h3>
              <p>{{ currentUser.role === 'admin' ? '管理员' : '普通用户' }}</p>
            </div>
            
            <el-descriptions title="用户信息" :column="2" border>
              <el-descriptions-item label="用户ID">{{ currentUser.userId }}</el-descriptions-item>
              <el-descriptions-item label="用户名">{{ currentUser.userName }}</el-descriptions-item>
              <el-descriptions-item label="昵称">{{ currentUser.nickName || '未设置' }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ currentUser.email }}</el-descriptions-item>
              <el-descriptions-item label="性别">{{ currentUser.sex || '未设置' }}</el-descriptions-item>
              <el-descriptions-item label="生日">
                {{ currentUser.birthday ? formatDate(currentUser.birthday) : '未设置' }}
              </el-descriptions-item>
              <el-descriptions-item label="账号状态">
                <el-tag :type="currentUser.status === 'active' ? 'success' : 'danger'">
                  {{ formatStatus(currentUser.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="注册时间">
                {{ formatDate(currentUser.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="最后更新">
                {{ formatDate(currentUser.updatedAt) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          
          <!-- 详细资料 -->
          <el-tab-pane label="详细资料" name="detail">
            <el-descriptions title="详细资料" :column="1" border>
              <el-descriptions-item label="自我介绍">
                <div class="user-intro">{{ currentUser.introduction || '该用户暂未填写自我介绍' }}</div>
              </el-descriptions-item>
            </el-descriptions>
            
            <el-divider content-position="left">第三方账号</el-divider>
            
            <p v-if="!currentUser.oauth2Provider" class="oauth-info">该用户未绑定第三方账号</p>
            <el-descriptions v-else :column="2" border>
              <el-descriptions-item label="第三方平台">{{ currentUser.oauth2Provider }}</el-descriptions-item>
              <el-descriptions-item label="绑定时间">{{ formatDate(currentUser.oauth2Expiry) }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          
          <!-- 操作记录 -->
          <el-tab-pane label="操作记录" name="logs">
            <div class="empty-data">
              <el-empty description="暂无操作记录" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="userDetailVisible = false">关闭</el-button>
          <el-button 
            v-if="currentUser"
            type="primary" 
            @click="handleRoleChange(currentUser); userDetailVisible = false">
            {{ currentUser.role === 'admin' ? '降为普通用户' : '升为管理员' }}
          </el-button>
          <el-button 
            v-if="currentUser"
            type="danger" 
            @click="handleDelete(currentUser); userDetailVisible = false">
            删除用户
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.user-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }
}

.search-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  
  .page-info {
    font-size: 14px;
    color: #666;
  }
}

.operation-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  .button-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

/* 用户详情样式 */
.user-detail {
  .user-avatar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
    
    h3 {
      margin: 10px 0 5px;
      font-size: 18px;
    }
    
    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }
  
  .user-intro {
    white-space: pre-wrap;
    line-height: 1.5;
    color: #606266;
  }
  
  .empty-data {
    padding: 30px 0;
  }
  
  .oauth-info {
    padding: 10px 0;
  }
}
</style> 