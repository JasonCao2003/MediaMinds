'use client';

import { useRouter } from 'next/navigation';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/common/ThemeToggle';

export default function NotFoundPage() {
  const router = useRouter();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, sm: 3 },
        position: 'relative',
        bgcolor: 'var(--mm-bg)',
      }}
    >
      {/* 右上角主题开关 */}
      <Box sx={{ position: 'fixed', top: { xs: 16, md: 24 }, right: { xs: 16, md: 24 }, zIndex: 10 }}>
        <ThemeToggle />
      </Box>

      {/* 居中的大块面板：整页只有这一块内容 */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 560,
          px: { xs: 3, sm: 5 },
          py: { xs: 4, sm: 5.5 },
          textAlign: 'center',
          borderRadius: 'var(--mm-radius-xl)',
          bgcolor: 'var(--mm-bg)',
          boxShadow: 'var(--mm-raised-xl)',
          animation: 'mm-scale-in 320ms var(--mm-ease) both',
        }}
      >
        <Stack alignItems="center" spacing={3}>
          <BrandLogo size={44} />
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '5rem', md: '7.5rem' },
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: 'var(--mm-accent-text)',
            }}
          >
            404
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            页面未找到
          </Typography>
          <Typography color="text.secondary">抱歉，您访问的页面不存在或已被移动。</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 0.5 }}>
            <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()}>
              返回上一页
            </Button>
            <Button variant="contained" startIcon={<HomeRoundedIcon />} onClick={() => router.push('/')}>
              返回首页
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
