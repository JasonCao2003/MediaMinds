'use client';

import axios, { AxiosError, AxiosRequestConfig, AxiosInstance } from 'axios';
import { getToken, useAuthStore } from '@/stores/authStore';
import { toast } from './notify';

/** 后端统一响应结构 */
export interface ApiResult<T = unknown> {
  code: number;
  msg?: string;
  message?: string;
  data: T;
}

const baseURL = '/api';

const instance: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
});

type GetRequest = <T = unknown>(url: string, config?: AxiosRequestConfig) => Promise<T>;
type SendRequest = <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) => Promise<T>;

export interface HttpClient {
  get: GetRequest;
  delete: GetRequest;
  post: SendRequest;
  put: SendRequest;
  patch: SendRequest;
}

/**
 * 由于响应拦截器已直接返回 `result.data`（ApiResult），
 * 这里用类型包装让调用方拿到解包后的类型，而非 AxiosResponse。
 */
const http: HttpClient = {
  get: ((url: string, config?: AxiosRequestConfig) => instance.get(url, config)) as unknown as GetRequest,
  delete: ((url: string, config?: AxiosRequestConfig) => instance.delete(url, config)) as unknown as GetRequest,
  post: ((url: string, data?: unknown, config?: AxiosRequestConfig) => instance.post(url, data, config)) as unknown as SendRequest,
  put: ((url: string, data?: unknown, config?: AxiosRequestConfig) => instance.put(url, data, config)) as unknown as SendRequest,
  patch: ((url: string, data?: unknown, config?: AxiosRequestConfig) => instance.patch(url, data, config)) as unknown as SendRequest,
};

/** 活跃请求控制器集合，用于页面切换时取消挂起请求 */
const pendingControllers = new Set<AbortController>();

/** 取消所有挂起请求（路由切换时调用） */
export const cancelAllRequests = () => {
  pendingControllers.forEach((controller) => controller.abort('route-change'));
  pendingControllers.clear();
};

const redirectToLogin = () => {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${redirect}`;
  }
};

const handleErrorCode = (code: number, message?: string) => {
  switch (code) {
    case 401:
      toast.error('请先登录');
      redirectToLogin();
      break;
    case 403:
      toast.error('没有权限访问');
      break;
    case 404:
      toast.error(message || '资源不存在');
      break;
    case 422:
      toast.error(message || '请求参数错误');
      break;
    default:
      toast.error(message || '请求失败');
  }
};

instance.interceptors.request.use(
  (config) => {
    const controller = new AbortController();
    pendingControllers.add(controller);
    (config as AxiosRequestConfig & { __controller?: AbortController }).__controller = controller;
    config.signal = controller.signal;

    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = token;
    }
    return config;
  },
  (err) => Promise.reject(err),
);

const releaseController = (config?: AxiosRequestConfig) => {
  const c = (config as AxiosRequestConfig & { __controller?: AbortController } | undefined)?.__controller;
  if (c) pendingControllers.delete(c);
};

instance.interceptors.response.use(
  (result) => {
    releaseController(result.config);

    // 非标准响应（如 Blob / 直链）直接透传
    if (!result.data || typeof result.data !== 'object' || !('code' in result.data)) {
      return result.data;
    }

    const { code, message, msg, data } = result.data as ApiResult;

    if (code >= 200 && code < 300) {
      return result.data as ApiResult;
    }
    if (code >= 400 && code < 500) {
      handleErrorCode(code, message || msg);
      return Promise.reject(result.data);
    }
    if (code >= 500) {
      toast.error(message || msg || '服务器错误，请稍后重试');
      return Promise.reject(result.data);
    }
    toast.error(message || msg || '未知错误');
    return Promise.reject(result.data);
  },
  (err: AxiosError) => {
    releaseController(err.config);
    if (axios.isCancel(err)) {
      return Promise.reject(err);
    }
    if (!err.response) {
      toast.error('网络错误，请检查网络连接');
      return Promise.reject(err);
    }
    const { status } = err.response;
    switch (status) {
      case 401:
        toast.error('请先登录');
        redirectToLogin();
        break;
      case 403:
        toast.error('没有权限访问');
        break;
      case 404:
        toast.error('请求的资源不存在');
        break;
      case 500:
        toast.error('服务器错误，请稍后重试');
        break;
      case 502:
        toast.error('网关错误');
        break;
      case 503:
        toast.error('服务不可用，请稍后重试');
        break;
      case 504:
        toast.error('网关超时');
        break;
      default:
        toast.error('服务异常');
    }
    return Promise.reject(err);
  },
);

export default http;
