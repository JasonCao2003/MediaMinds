<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import useUserInfoStore from '@/stores/userInfo.js'
import { useTokenStore } from '@/stores/token.js'
import { userInfoUpdateService, userPwdUpdateService, userDeleteService, userAvatarUpdateService, userInfoService } from '@/api/user.js'
import websocketService from '@/utils/websocketService'

const userInfoStore = useUserInfoStore()
const tokenStore = useTokenStore()

// 表单引用
const passwordFormRef = ref(null)

// 用户信息表单
const userForm = ref({
  userName: '',
  nickName: '',
  email: '',
  avatar: '',
  sex: '',
  birthday: '',
  introduction: ''
})

// 原始用户信息（用于重置表单）
const originalUserForm = ref({})

// 是否显示密码修改表单
const showPasswordForm = ref(false)

// 密码表单
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 状态标记
const isUpdating = ref(false)
const isChangingPassword = ref(false)
const isAvatarUploading = ref(false)
const avatarUrl = ref('')

// 密码表单验证规则
const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入旧密码', trigger: 'blur' },
    { min: 5, max: 16, message: '长度为5~16位非空字符', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 5, max: 16, message: '长度为5~16位非空字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 头像上传前的验证
const beforeAvatarUpload = (file) => {
  isAvatarUploading.value = true
  
  const isJPG = file.type === 'image/jpeg'
  const isPNG = file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2
  
  if (!isJPG && !isPNG) {
    ElMessage.error('头像只能是JPG或PNG格式!')
    isAvatarUploading.value = false
    return false
  }
  
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过2MB!')
    isAvatarUploading.value = false
    return false
  }
  
  // 使用自定义上传
  handleAvatarUpload(file)
  return false // 阻止el-upload默认上传
}

// 自定义头像上传处理
const handleAvatarUpload = async (file) => {
  try {
    const result = await userAvatarUpdateService(file)
    if (result.code === 200) {
      const avatarPath = result.data
      avatarUrl.value = avatarPath
      userForm.value.avatar = avatarPath
      
      // 更新头像后立即获取最新的用户信息
      await refreshUserInfo()
      
      ElMessage.success('头像更新成功')
    } else {
      ElMessage.error(result.message || '头像上传失败')
    }
  } catch (error) {
    ElMessage.error('头像上传失败，请重试')
    console.error('头像上传错误:', error)
  } finally {
    isAvatarUploading.value = false
  }
}

// 刷新用户信息
const refreshUserInfo = async () => {
  try {
    const result = await userInfoService()
    if (result.code === 200 && result.data) {
      // 更新存储的用户信息
      userInfoStore.setInfo(result.data)
      
      // 更新表单数据
      loadUserInfo()
    }
  } catch (error) {
    console.error('刷新用户信息失败:', error)
  }
}

// 加载用户信息
const loadUserInfo = () => {
  const userInfo = userInfoStore.info
  userForm.value = {
    userName: userInfo.userName || '',
    nickName: userInfo.nickName || '',
    email: userInfo.email || '',
    avatar: userInfo.avatar || '',
    sex: userInfo.sex || '',
    birthday: userInfo.birthday ? new Date(userInfo.birthday) : '',
    introduction: userInfo.introduction || ''
  }
  
  // 保存原始信息，用于重置
  originalUserForm.value = JSON.parse(JSON.stringify(userForm.value))
  
  avatarUrl.value = userInfo.avatar || ''
}

// 更新用户信息
const updateUserInfo = async () => {
  isUpdating.value = true
  try {
    const result = await userInfoUpdateService(userForm.value)
    if (result.code === 200) {
      ElMessage.success('个人信息更新成功')
      // 更新本地存储的用户信息
      userInfoStore.setInfo({ ...userInfoStore.info, ...userForm.value })
      // 更新原始信息
      originalUserForm.value = JSON.parse(JSON.stringify(userForm.value))
    } else {
      ElMessage.error(result.message || '个人信息更新失败')
    }
  } catch (error) {
    ElMessage.error('个人信息更新请求失败，请重试')
  } finally {
    isUpdating.value = false
  }
}

// 重置表单
const resetForm = () => {
  userForm.value = JSON.parse(JSON.stringify(originalUserForm.value))
  ElMessage.info('表单已重置')
}

// 修改密码
const changePassword = async (formEl) => {
  if (!formEl) return
  
  await formEl.validate(async (valid) => {
    if (valid) {
      isChangingPassword.value = true
      try {
        const result = await userPwdUpdateService({
          oldPassword: passwordForm.value.oldPassword,
          newPassword: passwordForm.value.newPassword
        })
        
        if (result.code === 200) {
          ElMessage.success(result.message || '密码修改成功')
          showPasswordForm.value = false
          passwordForm.value = {
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
          }
        } else {
          ElMessage.error(result.message || '密码修改失败')
        }
      } catch (error) {
        ElMessage.error('密码修改请求失败，请重试')
      } finally {
        isChangingPassword.value = false
      }
    }
  })
}

// 取消密码修改
const cancelPasswordChange = () => {
  showPasswordForm.value = false
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
}

// 注销账号
const deactivateAccount = () => {
  ElMessageBox.confirm(
    '注销账号后无法恢复，确认要继续吗？',
    '警告',
    {
      confirmButtonText: '确认注销',
      cancelButtonText: '取消',
      type: 'warning',
      draggable: true,
    }
  ).then(async () => {
    try {
      const result = await userDeleteService()
      if (result.code === 200) {
        ElMessage.success('账号已注销，即将退出登录')
        // 退出登录
        setTimeout(() => {
          // 断开WebSocket连接
          websocketService.disconnect()
          // 清除登录信息
          tokenStore.removeToken()
          userInfoStore.removeInfo()
          window.location.href = '/login'
        }, 2000)
      } else {
        ElMessage.error(result.message || '账号注销失败')
      }
    } catch (error) {
      ElMessage.error('账号注销请求失败，请重试')
    }
  }).catch(() => {})
}

// 日期格式化
const formatDate = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(() => {
  loadUserInfo()
})
</script>

<template>
  <div class="user-profile">
    <div class="page-header">
      <h2>个人信息管理</h2>
      <p class="subtitle">管理您的账号信息和偏好设置</p>
    </div>
    
    <el-card class="profile-card">
      <el-tabs>
        <el-tab-pane label="基本信息">
          <div class="profile-container">
            <div class="avatar-section">
              <el-upload
                class="avatar-uploader"
                :headers="{ Authorization: `Bearer ${tokenStore.getToken()}` }"
                name="image"
                :show-file-list="false"
                :before-upload="beforeAvatarUpload"
              >
                <el-avatar
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  :size="150"
                  class="avatar"
                />
                <div v-else class="avatar-uploader-icon">
                  <el-icon><el-icon-plus /></el-icon>
                </div>
                <div class="avatar-overlay" v-if="!isAvatarUploading">
                  <el-icon><el-icon-camera /></el-icon>
                </div>
                <el-icon v-if="isAvatarUploading" class="avatar-loading"><el-icon-loading /></el-icon>
              </el-upload>
              <div class="user-name-display">{{ userForm.nickName || '未设置昵称' }}</div>
            </div>
            
            <div class="info-section">
              <el-form 
                :model="userForm" 
                label-position="top"
                class="user-form"
              >
                <div class="form-group">
                  <h3 class="form-group-title">账号信息</h3>
                  <el-form-item label="用户名">
                    <el-input v-model="userForm.userName" placeholder="请输入用户名" disabled>
                      <template #prefix>
                        <el-icon><el-icon-user /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                  
                  <el-form-item label="昵称">
                    <el-input v-model="userForm.nickName" placeholder="请输入昵称">
                      <template #prefix>
                        <el-icon><el-icon-user /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                  
                  <el-form-item label="邮箱">
                    <el-input v-model="userForm.email" placeholder="请输入邮箱" disabled type="email">
                      <template #prefix>
                        <el-icon><el-icon-message /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </div>
                
                <div class="form-group">
                  <h3 class="form-group-title">个人信息</h3>
                  
                  <el-form-item label="性别">
                    <el-radio-group v-model="userForm.sex">
                      <el-radio label="男">男</el-radio>
                      <el-radio label="女">女</el-radio>
                      <el-radio label="其他">其他</el-radio>
                    </el-radio-group>
                  </el-form-item>
                  
                  <el-form-item label="生日">
                    <el-date-picker
                      v-model="userForm.birthday"
                      type="date"
                      placeholder="选择日期"
                      style="width: 100%"
                    />
                  </el-form-item>
                  
                  <el-form-item label="个人简介">
                    <el-input
                      v-model="userForm.introduction"
                      type="textarea"
                      :rows="4"
                      placeholder="请输入个人简介"
                    />
                  </el-form-item>
                </div>
                
                <el-form-item>
                  <el-button type="primary" @click="updateUserInfo" :loading="isUpdating">保存更改</el-button>
                  <el-button @click="resetForm" plain>重置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="安全设置">
          <div class="security-container">
            <el-card class="security-item" shadow="hover">
              <template #header>
                <div class="security-header">
                  <h3><el-icon><el-icon-lock /></el-icon> 密码设置</h3>
                  <el-button @click="showPasswordForm = !showPasswordForm" type="primary" plain>
                    {{ showPasswordForm ? '取消' : '修改密码' }}
                  </el-button>
                </div>
              </template>
              
              <el-collapse-transition>
                <div v-show="showPasswordForm" class="password-form-container">
                  <el-form
                    ref="passwordFormRef"
                    :model="passwordForm"
                    :rules="passwordRules"
                    label-position="top"
                  >
                    <el-form-item label="当前密码" prop="oldPassword">
                      <el-input
                        v-model="passwordForm.oldPassword"
                        type="password"
                        placeholder="请输入当前密码"
                        show-password
                      >
                        <template #prefix>
                          <el-icon><el-icon-key /></el-icon>
                        </template>
                      </el-input>
                    </el-form-item>
                    
                    <el-form-item label="新密码" prop="newPassword">
                      <el-input
                        v-model="passwordForm.newPassword"
                        type="password"
                        placeholder="请输入新密码"
                        show-password
                      >
                        <template #prefix>
                          <el-icon><el-icon-lock /></el-icon>
                        </template>
                      </el-input>
                    </el-form-item>
                    
                    <el-form-item label="确认新密码" prop="confirmPassword">
                      <el-input
                        v-model="passwordForm.confirmPassword"
                        type="password"
                        placeholder="请再次输入新密码"
                        show-password
                      >
                        <template #prefix>
                          <el-icon><el-icon-check /></el-icon>
                        </template>
                      </el-input>
                    </el-form-item>
                    
                    <el-form-item>
                      <el-button type="primary" @click="changePassword(passwordFormRef)" :loading="isChangingPassword">保存新密码</el-button>
                      <el-button @click="cancelPasswordChange" plain>取消</el-button>
                    </el-form-item>
                  </el-form>
                </div>
              </el-collapse-transition>
              
              <p v-if="!showPasswordForm" class="security-description">
                定期更换密码可以提高账号安全性，建议使用包含字母、数字和特殊字符的强密码。
              </p>
            </el-card>
            
            <el-card class="security-item" shadow="hover">
              <template #header>
                <div class="security-header">
                  <h3><el-icon><el-icon-message /></el-icon> 绑定邮箱</h3>
                  <el-tag type="success" effect="dark">已绑定</el-tag>
                </div>
              </template>
              <div class="security-detail">
                <div class="security-icon">
                  <el-icon><el-icon-message-box /></el-icon>
                </div>
                <div class="security-info">
                  <p class="security-description">
                    当前已绑定邮箱：<strong>{{ userForm.email }}</strong>
                  </p>
                  <p class="security-tip">邮箱是账号安全的重要凭证，请妥善保管</p>
                </div>
              </div>
            </el-card>
            
            <el-card class="security-item danger-zone" shadow="hover">
              <template #header>
                <div class="security-header">
                  <h3><el-icon><el-icon-delete /></el-icon> 注销账号</h3>
                  <el-button type="danger" plain @click="deactivateAccount">注销账号</el-button>
                </div>
              </template>
              <div class="security-detail">
                <div class="security-icon warning">
                  <el-icon><el-icon-warning /></el-icon>
                </div>
                <div class="security-info">
                  <p class="security-description warning-text">
                    注意：注销账号后将无法恢复，您的所有数据将被永久删除。
                  </p>
                  <p class="security-tip">在注销前，请确保已备份您想要保留的所有重要内容</p>
                </div>
              </div>
            </el-card>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="隐私设置">
          <div class="privacy-container">
            <el-card class="privacy-setting" shadow="hover">
              <template #header>
                <div class="security-header">
                  <h3><el-icon><el-icon-view /></el-icon> 个人资料可见性</h3>
                </div>
              </template>
              
              <el-form label-position="left" label-width="120px">
                <el-form-item label="个人简介">
                  <el-switch active-text="公开" inactive-text="仅自己可见" />
                </el-form-item>
                
                <el-form-item label="收藏列表">
                  <el-switch active-text="公开" inactive-text="仅自己可见" />
                </el-form-item>
                
                <el-form-item label="观看历史">
                  <el-switch active-text="公开" inactive-text="仅自己可见" />
                </el-form-item>
                
                <el-form-item label="收听历史">
                  <el-switch active-text="公开" inactive-text="仅自己可见" />
                </el-form-item>
              </el-form>
            </el-card>
            
            <el-card class="privacy-setting" shadow="hover">
              <template #header>
                <div class="security-header">
                  <h3><el-icon><el-icon-data-analysis /></el-icon> 数据使用许可</h3>
                </div>
              </template>
              
              <el-form label-position="left" label-width="240px">
                <el-form-item label="允许系统基于我的浏览推荐内容">
                  <el-switch active-text="允许" inactive-text="不允许" />
                </el-form-item>
                
                <el-form-item label="参与用户体验改进计划">
                  <el-switch active-text="参与" inactive-text="不参与" />
                </el-form-item>
                
                <el-form-item label="接收系统更新和新功能通知">
                  <el-switch active-text="接收" inactive-text="不接收" />
                </el-form-item>
              </el-form>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
$primary-color: #2563eb;
$secondary-color: #3b82f6;
$tertiary-color: #60a5fa;
$background-color: #f8fafc;
$border-color: #e2e8f0;
$text-color: #1e293b;
$error-color: #ef4444;
$success-color: #10b981;
$warning-color: #f59e0b;

.user-profile {
  padding: 20px;
  background-color: #f9fafc;
  min-height: calc(100vh - 120px);
}

.page-header {
  margin-bottom: 24px;
  position: relative;
  border-left: 4px solid $primary-color;
  padding-left: 16px;
  
  h2 {
    font-size: 28px;
    font-weight: 600;
    color: #333;
    margin: 0;
    background: linear-gradient(45deg, $primary-color, $secondary-color);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .subtitle {
    color: #6b7280;
    margin-top: 8px;
    font-size: 16px;
  }
}

.profile-card {
  margin-bottom: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
  
  :deep(.el-tabs__nav-wrap) {
    padding: 0 20px;
    background-color: #fafafa;
  }
  
  :deep(.el-tabs__item) {
    font-size: 16px;
    padding: 0 24px;
    height: 56px;
    line-height: 56px;
    transition: all 0.3s;
    
    &.is-active {
      color: $primary-color;
      font-weight: 600;
    }
    
    &:hover {
      color: $primary-color;
    }
  }
  
  :deep(.el-tabs__active-bar) {
    background-color: $primary-color;
    height: 3px;
  }
  
  :deep(.el-tabs__content) {
    padding: 0;
  }
  
  :deep(.el-tab-pane) {
    padding: 20px;
  }
}

.profile-container {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  padding: 20px 10px;
  
  .avatar-section {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    background-color: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    width: 250px;
  }
  
  .info-section {
    flex: 1 1 500px;
  }
}

.avatar-uploader {
  text-align: center;
  position: relative;
  margin-bottom: 15px;
  
  .avatar {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    border: 4px solid #fff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 20px rgba($primary-color, 0.25);
      
      & + .avatar-overlay {
        opacity: 1;
      }
    }
  }
  
  .avatar-uploader-icon {
    font-size: 36px;
    color: #8c939d;
    width: 150px;
    height: 150px;
    line-height: 150px;
    text-align: center;
    border: 2px dashed #d9d9d9;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      border-color: $primary-color;
      color: $primary-color;
      transform: scale(1.05);
    }
  }
  
  .avatar-overlay {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s;
    cursor: pointer;
    
    .el-icon {
      font-size: 36px;
      color: white;
    }
  }
  
  .avatar-loading {
    position: absolute;
    top: 60px;
    left: 60px;
    font-size: 30px;
    color: $primary-color;
  }
}

.user-name-display {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-top: 10px;
  margin-bottom: 5px;
}

.form-group {
  margin-bottom: 25px;
  background-color: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  
  .form-group-title {
    font-size: 18px;
    margin-top: 0;
    margin-bottom: 20px;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    
    &::after {
      content: '';
      display: block;
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, $border-color, transparent);
      margin-left: 15px;
    }
  }
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #333;
}

:deep(.el-input__wrapper), :deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  border-radius: 8px;
  transition: all 0.3s;
  
  &:hover {
    box-shadow: 0 0 0 1px $secondary-color inset;
  }
  
  &.is-focus {
    box-shadow: 0 0 0 1px $primary-color inset, 0 0 0 4px rgba($primary-color, 0.1);
  }
}

:deep(.el-input__prefix) {
  color: #6b7280;
  font-size: 16px;
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
  background-color: $primary-color;
  border-color: $primary-color;
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s;
  
  &.el-button--primary {
    background: linear-gradient(45deg, $primary-color, $secondary-color);
    border: none;
    box-shadow: 0 4px 12px rgba($primary-color, 0.2);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba($primary-color, 0.3);
    }
  }
  
  &.el-button--danger {
    background: linear-gradient(45deg, #f43f5e, #ef4444);
    border: none;
    box-shadow: 0 4px 12px rgba(#ef4444, 0.2);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(#ef4444, 0.3);
    }
    
    &.is-plain {
      background: transparent;
      color: #ef4444;
      border: 1px solid rgba(#ef4444, 0.2);
      box-shadow: none;
      
      &:hover {
        background: rgba(#ef4444, 0.04);
        color: #ef4444;
        border-color: #ef4444;
      }
    }
  }
}

.security-container,
.privacy-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 10px;
}

.security-item,
.privacy-setting {
  margin-bottom: 16px;
  border-radius: 10px;
  transition: all 0.3s;
  border: none;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
  
  :deep(.el-card__header) {
    background-color: #f9fafc;
    border-bottom: 1px solid #f0f2f5;
    padding: 15px 20px;
  }
  
  &.danger-zone {
    border: 1px dashed rgba($error-color, 0.3);
    
    :deep(.el-card__header) {
      background-color: rgba($error-color, 0.05);
    }
  }
}

.security-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    
    .el-icon {
      margin-right: 8px;
      font-size: 18px;
      color: $primary-color;
    }
  }
}

.security-detail {
  display: flex;
  padding: 15px 0;
  
  .security-icon {
    font-size: 36px;
    color: $primary-color;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba($primary-color, 0.1);
    border-radius: 10px;
    margin-right: 15px;
    
    &.warning {
      color: $warning-color;
      background-color: rgba($warning-color, 0.1);
    }
  }
  
  .security-info {
    flex: 1;
  }
}

.security-description {
  color: #606266;
  margin: 12px 0;
  line-height: 1.6;
}

.security-tip {
  color: #909399;
  font-size: 13px;
  margin: 8px 0 0;
}

.warning-text {
  color: $error-color;
}

.password-form-container {
  padding: 20px;
  background-color: #fafbfc;
  border-radius: 8px;
  margin-top: 15px;
  border: 1px solid $border-color;
}

:deep(.el-switch__core) {
  border-radius: 100px;
}

:deep(.el-switch.is-checked) {
  .el-switch__core {
    background: linear-gradient(45deg, $primary-color, $secondary-color);
  }
}

:deep(.el-tag--success) {
  background: linear-gradient(45deg, $success-color, #34d399);
  border: none;
}

/* 响应式调整 */
@media (max-width: 992px) {
  .profile-container {
    flex-direction: column;
    align-items: center;
    
    .avatar-section {
      width: 100%;
      max-width: 300px;
    }
    
    .info-section {
      width: 100%;
    }
  }
}

@media (max-width: 768px) {
  .page-header h2 {
    font-size: 24px;
  }
  
  .security-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  :deep(.el-tabs__item) {
    padding: 0 15px;
    font-size: 14px;
  }
}
</style> 