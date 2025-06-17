<script setup>
import { Lock, User, Message } from '@element-plus/icons-vue'
import { ref, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { userRegisterService, userInfoService } from '@/api/user.js'
import { accountLoginService, emailLoginService, faceLoginService, loginValidationService } from '@/api/login.js'
import { useTokenStore } from '@/stores/token.js'
import useUserInfoStore from '@/stores/userInfo.js'
import { useRouter } from 'vue-router'
// 引入图标
import { LogoGoogle, LogoGithub } from '@vicons/ionicons5'
import { Weixin } from '@vicons/fa'
// 导入WebSocket服务
import websocketService from '@/utils/websocketService'

// 定义数据模型
const registerData = ref({
  userName: '',
  password: '',
  rePassword: '',
  email: '',
  verificationCode: ''
})

// 用于存储人脸图片数据
const faceImage = ref(null)
// 摄像头视频流
const video = ref(null)
// 摄像头是否已打开
const isCameraOpen = ref(false)
// 媒体流对象
let mediaStream = null

// 校验密码的函数
const checkRePassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次确认密码'))
  } else if (value !== registerData.value.password) {
    callback(new Error('请确保两次输入的密码一样'))
  } else {
    callback()
  }
}

// 定义表单校验规则
const rules = {
  userName: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 5, max: 16, message: '长度为5~16位非空字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 5, max: 16, message: '长度为5~16位非空字符', trigger: 'blur' }
  ],
  rePassword: [
    { validator: checkRePassword, trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
  ],
  verificationCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ]
}

const router = useRouter()
const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()

// 注册
const register = async () => {
  try {
    let result = await userRegisterService(registerData.value)
    if (result.code === 200) {
      ElMessage.success(result.msg || '注册成功')
    } else {
      ElMessage.error(result.msg || '注册失败')
    }
  } catch (error) {
    ElMessage.error('注册请求失败，请重试')
  }
}

const formRef = ref(null)

// 处理账号登录
const handleAccountLogin = async () => {
  console.log('点击账号登录按钮')
  if (!formRef.value) {
    console.error('表单引用未找到')
    return
  }
  
  try {
    // 验证表单
    await formRef.value.validate()
    console.log('账号登录表单验证通过，开始登录')
    await accountLogin()
  } catch (error) {
    console.error('账号登录表单验证失败:', error)
    ElMessage.error('请正确填写账号和密码')
  }
}

// 处理邮箱登录
const handleEmailLogin = async () => {
  console.log('点击邮箱登录按钮')
  if (!formRef.value) {
    console.error('表单引用未找到')
    return
  }
  
  try {
    // 验证表单
    await formRef.value.validate()
    console.log('邮箱登录表单验证通过，开始登录')
    await emailLogin()
  } catch (error) {
    console.error('邮箱登录表单验证失败:', error)
    ElMessage.error('请正确填写邮箱和验证码')
  }
}

// 登录成功后获取用户信息
const getUserInfo = async () => {
  try {
    const result = await userInfoService()
    if (result.code === 200) {
      userInfoStore.setInfo(result.data)
      
      // 连接WebSocket
      websocketService.connect()
      
      // 根据角色导航到不同页面
      if (userInfoStore.isAdmin()) {
        router.push('/admin/dashboard')
      } else {
        // 普通用户登录成功后，跳转到内容浏览页面
        router.push('/content')
      }
    } else {
      ElMessage.error(result.msg || '获取用户信息失败')
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败，请重新登录')
    tokenStore.removeToken()
    router.push('/login')
  }
}

// 账号登录
const accountLogin = async () => {
  try {
    console.log('开始账号登录，用户名:', registerData.value.userName)
    let result = await accountLoginService({
      userName: registerData.value.userName,
      password: registerData.value.password
    })
    console.log('账号登录响应:', result)
    tokenStore.setToken(result.data)
    // 获取用户信息
    await getUserInfo()
  } catch (error) {
    console.error('账号登录失败:', error)
    if (error.message) {
      ElMessage.error(error.message)
    }
  }
}

// 邮箱登录
const emailLogin = async () => {
  try {
    console.log('开始邮箱登录，邮箱:', registerData.value.email)
    let result = await emailLoginService({
      email: registerData.value.email,
      code: registerData.value.verificationCode
    })
    console.log('邮箱登录响应:', result)
    tokenStore.setToken(result.data)
    // 获取用户信息
    await getUserInfo()
  } catch (error) {
    console.error('邮箱登录失败:', error)
    if (error.message) {
      ElMessage.error(error.message)
    }
  }
}

// 发送邮箱验证码
const sendVerificationCode = async () => {
  if (!registerData.value.email) {
    ElMessage.error('请输入邮箱')
    return
  }
  try {
    console.log('发送验证码到邮箱:', registerData.value.email)
    let result = await loginValidationService({ email: registerData.value.email })
    console.log('发送验证码响应:', result)
    ElMessage.success(result.message || '验证码已发送，请查收邮箱')
  } catch (error) {
    console.error('发送验证码失败:', error)
    if (error.message) {
      ElMessage.error(error.message)
    }
  }
}

// 打开摄像头
const openCamera = async () => {
  try {
    await nextTick()
    if (!video.value) {
      ElMessage.error('视频元素未正确加载，请刷新页面重试')
      return
    }
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
    video.value.srcObject = mediaStream
    isCameraOpen.value = true
  } catch (error) {
    ElMessage.error('无法打开摄像头，请检查设备权限')
  }
}

// 拍摄照片
const takePhoto = () => {
  if (!isCameraOpen.value) return

  const canvas = document.createElement('canvas')
  canvas.width = video.value.videoWidth
  canvas.height = video.value.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video.value, 0, 0, canvas.width, canvas.height)

  canvas.toBlob((blob) => {
    faceImage.value = new File([blob], 'face.jpg', { type: 'image/jpeg' })
    closeCamera()
    faceLogin()
  }, 'image/jpeg')
}

// 关闭摄像头
const closeCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  isCameraOpen.value = false
}

// 人脸登录
const faceLogin = async () => {
  if (!faceImage.value) {
    ElMessage.error('请拍摄人脸照片')
    return
  }
  try {
    const formData = new FormData()
    formData.append('image', faceImage.value)
    let result = await faceLoginService(formData)
    tokenStore.setToken(result.data)
    // 获取用户信息
    await getUserInfo()
  } catch (error) {
    // 错误已在请求拦截器中处理
  }
}

// 清空数据模型的数据
const clearRegisterData = () => {
  registerData.value = {
    userName: '',
    password: '',
    rePassword: '',
    email: '',
    verificationCode: ''
  }
  faceImage.value = null
}

// 控制注册与登录表单的显示，默认显示登录
const isRegister = ref(false)
// 控制账号登录、邮箱登录和人脸登录的显示，默认显示账号登录
const loginType = ref('account')

// 组件卸载时关闭摄像头
onUnmounted(() => {
  closeCamera()
})

// 定义 OAuth 2 登录方法
const googleLogin = () => {
  // 跳转到 Google OAuth 2 登录页面
  window.location.href = 'https://accounts.google.com/o/oauth2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=openid%20email%20profile';
}

const githubLogin = () => {
  // 跳转到 GitHub OAuth 2 登录页面
  window.location.href = 'https://github.com/login/oauth/authorize?client_id=YOUR_GITHUB_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=user:email';
}

const wechatLogin = () => {
  // 跳转到微信 OAuth 2 登录页面
  window.location.href = 'https://open.weixin.qq.com/connect/qrconnect?appid=YOUR_WECHAT_APPID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=snsapi_login&state=STATE#wechat_redirect';
}
</script>

<template>
  <div class="login-container">
    <div class="left-section">
      <div class="logo">
        <img src="@/assets/logo.png" alt="Logo" />
      </div>
      <div class="slogan">
        让媒体管理更简单
      </div>
      <div class="features">
        <div class="feature-item">
          <span>智能媒体管理</span>
        </div>
        <div class="feature-item">
          <span>安全可靠</span>
        </div>
        <div class="feature-item">
          <span>多端同步</span>
        </div>
      </div>
    </div>
    <div class="right-section">
      <div class="form-wrapper">
        <div class="form-header">
          <h1>{{ isRegister ? '注册' : '登录' }}</h1>
          <div class="switch-buttons">
            <el-button 
              :class="{ active: !isRegister }" 
              @click="isRegister = false; clearRegisterData()"
              class="switch-btn">
              登录
            </el-button>
            <el-button 
              :class="{ active: isRegister }" 
              @click="isRegister = true; clearRegisterData()"
              class="switch-btn">
              注册
            </el-button>
          </div>
        </div>

        <el-form ref="formRef" :model="registerData" :rules="rules" autocomplete="off" size="large" class="main-form">
          <template v-if="isRegister">
            <el-form-item prop="userName">
              <el-input v-model="registerData.userName" :prefix-icon="User" placeholder="请输入用户名"
                class="input-field"></el-input>
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="registerData.password" :prefix-icon="Lock" placeholder="请输入密码" type="password"
                class="input-field"></el-input>
            </el-form-item>
            <el-form-item prop="rePassword">
              <el-input v-model="registerData.rePassword" :prefix-icon="Lock" placeholder="请再次输入密码" type="password"
                class="input-field"></el-input>
            </el-form-item>
            <el-form-item prop="email">
              <el-input v-model="registerData.email" :prefix-icon="Message" placeholder="请输入邮箱"
                class="input-field"></el-input>
            </el-form-item>
            <el-button auto-insert-space type="primary" @click="register" class="submit-btn">
              注册
            </el-button>
          </template>

          <template v-else>
            <div class="login-type-switch">
              <el-button 
                :class="{ active: loginType === 'account' }" 
                @click="loginType = 'account'; clearRegisterData()" 
                class="login-type-btn">
                账号登录
              </el-button>
              <el-button 
                :class="{ active: loginType === 'email' }" 
                @click="loginType = 'email'; clearRegisterData()" 
                class="login-type-btn">
                邮箱登录
              </el-button>
              <el-button 
                :class="{ active: loginType === 'face' }" 
                @click="loginType = 'face'; clearRegisterData()" 
                class="login-type-btn">
                人脸登录
              </el-button>
            </div>

            <template v-if="loginType === 'account'">
              <el-form-item prop="userName">
                <el-input v-model="registerData.userName" :prefix-icon="User" placeholder="请输入用户名"
                  class="input-field"></el-input>
              </el-form-item>
              <el-form-item prop="password">
                <el-input v-model="registerData.password" :prefix-icon="Lock" placeholder="请输入密码" type="password"
                  class="input-field"></el-input>
              </el-form-item>
              <el-form-item class="remember-forgot">
                <el-checkbox>记住我</el-checkbox>
                <el-link :underline="false" type="primary">忘记密码？</el-link>
              </el-form-item>
              <el-button auto-insert-space type="primary" @click="handleAccountLogin" class="submit-btn">
                登录
              </el-button>
            </template>

            <template v-if="loginType === 'email'">
              <el-form-item prop="email">
                <el-input v-model="registerData.email" :prefix-icon="Message" placeholder="请输入邮箱"
                  class="input-field"></el-input>
              </el-form-item>
              <el-form-item prop="verificationCode">
                <el-input v-model="registerData.verificationCode" placeholder="请输入验证码" :prefix-icon="Lock"
                  class="input-field">
                  <template #append>
                    <el-button @click="sendVerificationCode" :disabled="!registerData.email" class="get-code-btn">
                      获取验证码
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>
              <el-button auto-insert-space type="primary" @click="handleEmailLogin" class="submit-btn">
                邮箱登录
              </el-button>
            </template>

            <template v-if="loginType === 'face'">
              <div class="face-login-box">
                <video ref="video" autoplay playsinline width="300" height="220" class="face-video"></video>
                <div class="face-btns">
                  <el-button type="primary" @click="openCamera">打开摄像头</el-button>
                  <el-button type="success" @click="takePhoto" :disabled="!isCameraOpen">拍照登录</el-button>
                </div>
              </div>
            </template>
          </template>

          <div class="oauth-login">
            <div class="oauth-title">或使用以下方式登录</div>
            <div class="oauth-buttons">
              <el-button @click="googleLogin" class="oauth-btn google-btn">
                <LogoGoogle class="oauth-icon" />
              </el-button>
              <el-button @click="githubLogin" class="oauth-btn github-btn">
                <LogoGithub class="oauth-icon" />
              </el-button>
              <el-button @click="wechatLogin" class="oauth-btn wechat-btn">
                <Weixin class="oauth-icon" />
              </el-button>
            </div>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$primary-color: #2563eb;
$secondary-color: #3b82f6;
$background-color: #f8fafc;
$border-color: #e2e8f0;
$text-color: #1e293b;
$error-color: #ef4444;
$success-color: #10b981;

.login-container {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%);
    transform: rotate(30deg);
    animation: gradientRotate 20s linear infinite;
  }
}

.left-section {
  flex: 1;
  background: url('@/assets/login_bg.png') no-repeat center / cover;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding: 2rem;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.4) 100%);
    backdrop-filter: blur(4px);
  }

  .logo {
    position: absolute;
    top: 3rem;
    left: 3rem;
    z-index: 1;

    img {
      width: 180px;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
    }
  }

  .slogan {
    color: white;
    font-size: 3.5rem;
    font-weight: 700;
    text-align: center;
    padding: 2rem;
    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    max-width: 80%;
    z-index: 1;
    line-height: 1.2;
    letter-spacing: -0.5px;
  }

  .features {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-top: 3rem;
    z-index: 1;

    .feature-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: white;
      font-size: 1.2rem;
      font-weight: 500;

      .el-icon {
        font-size: 1.5rem;
        color: $primary-color;
      }
    }
  }
}

.right-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  position: relative;
  z-index: 1;

  .form-wrapper {
    width: 90%;
    max-width: 500px;
    padding: 3.5rem;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);

    .form-header {
      text-align: center;
      margin-bottom: 3rem;

      h1 {
        color: $primary-color;
        font-size: 2.5rem;
        margin-bottom: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.5px;
        background: linear-gradient(45deg, $primary-color, $secondary-color);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .switch-buttons {
        display: flex;
        gap: 1.5rem;
        justify-content: center;

        .switch-btn {
          flex: 1;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 500;
          background: white;
          border: 2px solid $border-color;
          color: $text-color;
          transition: all 0.3s ease;

          &.active {
            background: linear-gradient(45deg, $primary-color, $secondary-color);
            color: white;
            border: none;
          }

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
          }
        }
      }
    }

    .login-type-switch {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 3rem;
      justify-content: center;

      .login-type-btn {
        flex: 1;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 500;
        background: white;
        border: 2px solid $border-color;
        color: $text-color;
        transition: all 0.3s ease;

        &.active {
          background: linear-gradient(45deg, $primary-color, $secondary-color);
          color: white;
          border: none;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
        }
      }
    }

    .input-field {
      border-radius: 12px;
      height: 56px;
      font-size: 1.1rem;
      transition: all 0.3s ease;
      border: 2px solid $border-color;
      background: rgba(255, 255, 255, 0.8);

      &:focus {
        border-color: $primary-color;
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        background: white;
      }

      &:hover {
        border-color: $secondary-color;
        background: white;
      }
    }

    .submit-btn {
      width: 100%;
      padding: 1.2rem;
      border-radius: 12px;
      font-size: 1.2rem;
      font-weight: 600;
      margin-top: 2rem;
      background: linear-gradient(45deg, $primary-color, $secondary-color);
      border: none;
      color: white;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(37, 99, 235, 0.2);
      }
    }

    .face-login-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      margin-top: 2rem;
      padding: 2rem;
      background: rgba(37, 99, 235, 0.05);
      border-radius: 16px;
      border: 1px solid rgba(37, 99, 235, 0.1);
    }
  }
}

.oauth-login {
  margin-top: 3rem;
  text-align: center;

  .oauth-title {
    margin-bottom: 2rem;
    color: $text-color;
    font-size: 1.1rem;
    font-weight: 500;
    letter-spacing: 0.5px;
    position: relative;

    &::before,
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 30%;
      height: 1px;
      background: linear-gradient(90deg, transparent, $border-color, transparent);
    }

    &::before {
      left: 0;
    }

    &::after {
      right: 0;
    }
  }

  .oauth-buttons {
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

  .oauth-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    padding: 0;
    border: none;

    &:hover {
      transform: translateY(-4px) scale(1.1);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }
  }

  .oauth-icon {
    width: 28px;
    height: 28px;
    color: white;
  }

  .google-btn {
    background: #4285F4;
    &:hover {
      background: #3367d6;
    }
  }

  .github-btn {
    background: #24292e;
    &:hover {
      background: #1b1f23;
    }
  }

  .wechat-btn {
    background: #07C160;
    &:hover {
      background: #06ad56;
    }
  }
}

@keyframes gradientRotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>