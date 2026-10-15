'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { userInfoService } from '@/api/user';

/**
 * 应用级引导：有 token 但用户信息不完整时拉取用户信息。
 */
export default function AuthBootstrap() {
  const token = useAuthStore((s) => s.token);
  const info = useAuthStore((s) => s.info);
  const setInfo = useAuthStore((s) => s.setInfo);

  useEffect(() => {
    if (!token) return;

    const incomplete = !info?.userId && !info?.userName;
    if (incomplete) {
      userInfoService()
        .then((res) => {
          if (res.code === 200 && res.data) setInfo(res.data);
        })
        .catch(() => {
          /* 拦截器已提示 */
        });
    }
  }, [token, info, setInfo]);

  return null;
}
