import {defineStore} from 'pinia'
import {ref} from 'vue'

const useUserInfoStore = defineStore('userInfo', () => {
    //定义状态相关的内容
    const info = ref({})
    // 角色信息
    const role = ref('')
    
    const setInfo = (newInfo) => {
        info.value = newInfo
        // 设置角色信息
        if (newInfo && newInfo.role) {
            role.value = newInfo.role
        }
    }
    
    const removeInfo = () => {
        info.value = {}
        role.value = ''
    }
    
    // 检查是否是管理员
    const isAdmin = () => {
        return role.value === 'admin'
    }
    
    // 检查是否是普通用户
    const isUser = () => {
        return role.value === 'user'
    }
    
    // 检查用户是否已登录 - 修复了检查逻辑，使用多个字段判断
    const isLoggedIn = () => {
        // 检查多个字段以更健壮地判断登录状态
        return !!(info.value.userId || 
                 (info.value.userName && info.value.role) || 
                 (info.value.email && role.value));
    }
    
    return {info, role, setInfo, removeInfo, isAdmin, isUser, isLoggedIn}
}, {persist: true})

export default useUserInfoStore;