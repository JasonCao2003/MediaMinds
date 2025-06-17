// 请求实例
import axios from 'axios';
import {ElMessage} from 'element-plus';
import {useTokenStore} from '@/stores/token.js'
import router from '@/router/index.js';

// 定义一个变量，记录公共的前缀 (http://localhost:5173/api)
const baseURL = '/api';
const instance = axios.create({baseURL})

// 存储活跃请求，用于取消
const pendingRequests = new Map();

// 生成请求的唯一key
const generateRequestKey = (config) => {
    const { url, method, params, data } = config;
    return [url, method, JSON.stringify(params), JSON.stringify(data)].join('&');
};

// 添加请求到pendingRequests
const addPendingRequest = (config) => {
    const requestKey = generateRequestKey(config);
    config.cancelToken = config.cancelToken || new axios.CancelToken(cancel => {
        if (!pendingRequests.has(requestKey)) {
            pendingRequests.set(requestKey, cancel);
        }
    });
};

// 移除请求从pendingRequests
const removePendingRequest = (config) => {
    const requestKey = generateRequestKey(config);
    if (pendingRequests.has(requestKey)) {
        pendingRequests.delete(requestKey);
    }
};

// 取消所有请求
export const cancelAllRequests = () => {
    pendingRequests.forEach(cancel => {
        cancel('组件卸载，取消请求');
    });
    pendingRequests.clear();
};

// 请求拦截器：注入token
instance.interceptors.request.use(
    // 请求前的回调
    (config) => {
        // 取消相同的请求
        removePendingRequest(config);
        // 添加新请求到pending
        addPendingRequest(config);
        
        // 从Store中获取token
        const tokenStore = useTokenStore();
        // 判断有没有token，并添加token
        const token = tokenStore.getToken();
        if (token) {
            config.headers.Authorization = token;
        }
        return config;
    },
    (err) => {
        return Promise.reject(err);
    }
)

//响应拦截器：状态验证
instance.interceptors.response.use(
    result => {
        // 移除已完成的请求
        removePendingRequest(result.config);
        
        const { code, message, data } = result.data;
        
        // 2xx 成功状态码处理
        if (code >= 200 && code < 300) {
            return result.data;
        }

        // 4xx 客户端错误处理
        if (code >= 400 && code < 500) {
            switch (code) {
                case 401:
                    ElMessage.error('请先登录');
                    router.push('/login');
                    break;
                case 403:
                    ElMessage.error('没有权限访问');
                    break;
                case 404:
                    ElMessage.error(message || '资源不存在');
                    break;
                case 422:
                    ElMessage.error(message || '请求参数错误');
                    break;
                default:
                    ElMessage.error(message || '请求失败');
            }
            return Promise.reject(result.data);
        }

        // 5xx 服务器错误处理
        if (code >= 500) {
            ElMessage.error(message || '服务器错误，请稍后重试');
            return Promise.reject(result.data);
        }

        // 其他未知错误
        ElMessage.error(message || '未知错误');
        return Promise.reject(result.data);
    },
    err => {
        // 网络错误或服务器未响应
        if (!err.response) {
            ElMessage.error('网络错误，请检查网络连接');
            return Promise.reject(err);
        }

        // HTTP状态码错误处理
        const { status } = err.response;
        switch (status) {
            case 401:
                ElMessage.error('请先登录');
                router.push('/login');
                break;
            case 403:
                ElMessage.error('没有权限访问');
                break;
            case 404:
                ElMessage.error('请求的资源不存在');
                break;
            case 500:
                ElMessage.error('服务器错误，请稍后重试');
                break;
            case 502:
                ElMessage.error('网关错误');
                break;
            case 503:
                ElMessage.error('服务不可用，请稍后重试');
                break;
            case 504:
                ElMessage.error('网关超时');
                break;
            default:
                ElMessage.error('服务异常');
        }
        return Promise.reject(err);
    }
)

export default instance;