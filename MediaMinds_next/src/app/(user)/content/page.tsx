'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useAuthStore } from '@/stores/authStore';
import { getContentCategoryService } from '@/api/stats';

const QUOTES = [
  { text: '生活不是等待风暴过去，而是学会在雨中跳舞。', author: '薇薇安·格林' },
  { text: '创造力就是智力在玩耍。', author: '爱因斯坦' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。', author: '尼采' },
  { text: '做你热爱的事，成功就会追随你。', author: '无名氏' },
  { text: '知识就是力量。', author: '培根' },
  { text: '把每一个平凡的日子，变成美好的回忆。', author: '无名氏' },
];

function greetingOf(hour: number) {
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
}

/** 响应式 CSS Grid 容器 */
function AutoGrid({
  minWidth = 260,
  children,
  sx,
}: {
  minWidth?: number;
  children: React.ReactNode;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` },
        gap: 3,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

const FEATURES = [
  {
    key: 'book',
    href: '/content/book',
    title: '知识宝库',
    desc: '沉浸文字的海洋，探索无尽的智慧与想象',
    icon: <MenuBookRoundedIcon sx={{ fontSize: 40 }} />,
    color: '#2563EB',
    btn: '立即探索',
  },
  {
    key: 'video',
    href: '/content/video',
    title: '视觉盛宴',
    desc: '开启影像之旅，感受视觉的震撼与魅力',
    icon: <MovieRoundedIcon sx={{ fontSize: 40 }} />,
    color: '#0D9488',
    btn: '开始观看',
  },
  {
    key: 'music',
    href: '/content/music',
    title: '声音画廊',
    desc: '聆听灵魂的律动，体验音乐的无限可能',
    icon: <HeadphonesRoundedIcon sx={{ fontSize: 40 }} />,
    color: '#D97706',
    btn: '开始聆听',
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const info = useAuthStore((s) => s.info);

  const [now, setNow] = useState<Date | null>(null);
  const [stats, setStats] = useState({ books: 0, videos: 0, music: 0, loading: true });

  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getContentCategoryService()
      .then((res) =>
        setStats({ books: res.books || 0, videos: res.movies || 0, music: res.songs || 0, loading: false }),
      )
      .catch(() => setStats({ books: 1245, videos: 857, music: 1634, loading: false }));
  }, []);

  const greeting = now ? greetingOf(now.getHours()) : '你好';
  const timeText = now
    ? now.toLocaleDateString('zh-CN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const displayName = info?.nickName || info?.userName || '用户';

  const statItems = [
    { label: '图书资源', value: stats.books, icon: <MenuBookRoundedIcon />, color: '#2563EB' },
    { label: '视频资源', value: stats.videos, icon: <MovieRoundedIcon />, color: '#0D9488' },
    { label: '音乐资源', value: stats.music, icon: <HeadphonesRoundedIcon />, color: '#D97706' },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* 欢迎头部 */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 5,
          background: (t) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4C1D95 100%)'
              : 'linear-gradient(135deg, #EEF2FF 0%, #FDF2F8 100%)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                {greeting}，{displayName}！
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip icon={<AutoAwesomeRoundedIcon />} label={timeText} variant="outlined" />
                <Chip label="☀️ 晴 23°C" variant="outlined" />
              </Stack>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.secondary' }}>
              欢迎回到{' '}
              <Box
                component="span"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg,#4F46E5,#E11D48)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                MediaMinds
              </Box>
              ，让灵感与知识在这里交汇
            </Typography>

            <Box
              sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                borderLeft: '5px solid',
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="h6" sx={{ fontStyle: 'italic', fontWeight: 500, mb: 1, lineHeight: 1.6 }}>
                「{quote.text}」
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 600, color: 'primary.main' }}>
                — {quote.author}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* 资源统计 */}
      <AutoGrid minWidth={240}>
        {statItems.map((item) => (
          <Card key={item.label} className="mm-hover-lift" sx={{ borderRadius: 4 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar
                sx={{ width: 72, height: 72, mx: 'auto', mb: 2, bgcolor: alpha(item.color, 0.14), color: item.color }}
              >
                {item.icon}
              </Avatar>
              {stats.loading ? (
                <Skeleton variant="text" width={100} sx={{ mx: 'auto', fontSize: '2.5rem' }} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 800, color: item.color }}>
                  {item.value}
                </Typography>
              )}
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                {item.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </AutoGrid>

      {/* 功能卡片 */}
      <AutoGrid minWidth={280} sx={{ mt: 4 }}>
        {FEATURES.map((f) => (
          <Card key={f.key} className="mm-hover-lift" sx={{ borderRadius: 4 }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Box
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  mx: 'auto',
                  mb: 2,
                  bgcolor: alpha(f.color, 0.12),
                  color: f.color,
                }}
              >
                {f.icon}
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                {f.title}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3, minHeight: 48 }}>
                {f.desc}
              </Typography>
              <Button
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => router.push(f.href)}
                sx={{ bgcolor: f.color, '&:hover': { bgcolor: f.color, filter: 'brightness(.92)' } }}
              >
                {f.btn}
              </Button>
            </CardContent>
          </Card>
        ))}
      </AutoGrid>

      {/* 快捷入口 */}
      <Box
        sx={{
          mt: 4,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 3,
        }}
      >
        <Card
          sx={{
            borderRadius: 4,
            color: '#fff',
            background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Avatar
                src={info?.avatar || undefined}
                sx={{ width: 72, height: 72, border: '3px solid #fff', boxShadow: '0 0 24px rgba(255,255,255,.5)' }}
              >
                {displayName[0]}
              </Avatar>
              <Typography variant="h5" fontWeight={700}>
                个人空间
              </Typography>
            </Stack>
            <Typography sx={{ opacity: 0.9, mb: 3, fontSize: '1.05rem' }}>
              在这里定制专属于你的内容世界，管理你的收藏与偏好。
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/content/profile')}
              sx={{ bgcolor: '#fff', color: '#7C3AED', '&:hover': { bgcolor: 'rgba(255,255,255,.9)' } }}
            >
              前往个人空间
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
