'use client';

import { useRouter } from 'next/navigation';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import BrandLogo from '@/components/BrandLogo';

export default function NotFoundPage() {
  const router = useRouter();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 3,
        background:
          'radial-gradient(circle at 20% 20%, rgba(79,70,229,.12), transparent 45%), radial-gradient(circle at 80% 70%, rgba(225,29,72,.12), transparent 45%)',
      }}
    >
      <Stack alignItems="center" spacing={3} sx={{ textAlign: 'center', maxWidth: 520 }}>
        <BrandLogo size={44} />
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '6rem', md: '9rem' },
            fontWeight: 800,
            lineHeight: 1,
            background: 'linear-gradient(135deg,#4F46E5,#E11D48)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          404
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          页面未找到
        </Typography>
        <Typography color="text.secondary">抱歉，您访问的页面不存在或已被移动。</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()}>
            返回上一页
          </Button>
          <Button variant="contained" startIcon={<HomeRoundedIcon />} onClick={() => router.push('/')}>
            返回首页
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
