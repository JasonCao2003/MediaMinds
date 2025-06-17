//定义store
import {defineStore} from 'pinia'
import {ref} from 'vue'

export const useTokenStore = defineStore('token', () => {
        // 定义状态的内容
        const token = ref('')
        // 修改token的值
        const setToken = (newToken) => {
            token.value = newToken
        }
        // 获取token的值
        const getToken = () => {
            return token.value
        }
        // 移除token的值
        const removeToken = () => {
            token.value = ''
        }
        return {token, setToken, getToken, removeToken}
    }, {
        persist: true
    }
);