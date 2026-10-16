'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import BrandLogo from '@/components/BrandLogo';
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
        bgcolor: 'var(--mm-bg)',
      }}
    >
      <Stack alignItems="center" spacing={3}>
        <BrandLogo size={44} />
        <CircularProgress aria-label="正在跳转" />
      </Stack>
    </Box>
  );
}
