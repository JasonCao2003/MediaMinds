'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuthStore } from '@/stores/authStore';

/**
 * 根路径分流：未登录跳登录页，否则进入内容端（单用户模式，无角色区分）。
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 等待持久化状态水合
    const timer = setTimeout(() => {
      const { token } = useAuthStore.getState();
      if (!token) {
        router.replace('/login');
      } else {
        router.replace('/content');
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
