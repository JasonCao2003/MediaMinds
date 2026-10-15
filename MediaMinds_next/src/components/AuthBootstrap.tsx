'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { userInfoService } from '@/api/user';
import websocketService from '@/lib/websocket';

/**
 * 应用级引导：
 *  - 有 token 但用户信息不完整时拉取用户信息
 *  - 已登录时建立 WebSocket 通知连接
 */
export default function AuthBootstrap() {
  const token = useAuthStore((s) => s.token);
  const info = useAuthStore((s) => s.info);
  const setInfo = useAuthStore((s) => s.setInfo);

  useEffect(() => {
    if (!token) {
      websocketService.disconnect();
      return;
    }

    const incomplete = !info?.userId && !(info?.userName && info?.role);
    if (incomplete) {
      userInfoService()
        .then((res) => {
          if (res.code === 200 && res.data) setInfo(res.data);
        })
        .catch(() => {
          /* 拦截器已提示 */
        });
    }

    websocketService.connect();
    return () => {
      // 保持连接跨路由存活，仅在卸载应用时断开
    };
  }, [token, info, setInfo]);

  useEffect(() => {
    const onUnload = () => websocketService.disconnect();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  return null;
}
