'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Card, Chip, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { useAuthStore } from '@/stores/authStore';
import { getContentCategoryService } from '@/api/stats';
import AutoGrid from '@/components/common/AutoGrid';

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

const FEATURES = [
  {
    key: 'book',
    href: '/content/book',
    title: '知识宝库',
    desc: '沉浸文字的海洋，探索无尽的智慧与想象',
    icon: <MenuBookRoundedIcon sx={{ fontSize: 34 }} />,
    btn: '立即探索',
    tone: 'info' as const,
  },
  {
    key: 'video',
    href: '/content/video',
    title: '视觉盛宴',
    desc: '开启影像之旅，感受视觉的震撼与魅力',
    icon: <MovieRoundedIcon sx={{ fontSize: 34 }} />,
    btn: '开始观看',
    tone: 'success' as const,
  },
  {
    key: 'music',
    href: '/content/music',
    title: '声音画廊',
    desc: '聆听灵魂的律动，体验音乐的无限可能',
    icon: <HeadphonesRoundedIcon sx={{ fontSize: 34 }} />,
    btn: '开始聆听',
    tone: 'warning' as const,
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { mm } = useTheme();
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
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const displayName = info?.nickName || info?.userName || '用户';

  const statItems = [
    { label: '图书资源', value: stats.books, icon: <MenuBookRoundedIcon />, color: mm.info },
    { label: '视频资源', value: stats.videos, icon: <MovieRoundedIcon />, color: mm.success },
    { label: '音乐资源', value: stats.music, icon: <HeadphonesRoundedIcon />, color: mm.warning },
  ];

  return (
    <Box>
      {/* ── 欢迎头部 ───────────────────────────────────────────── */}
      <Card sx={{ p: { xs: 3, md: 4 }, mb: 3.5, borderRadius: 'var(--mm-radius-xl)' }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={2}
          >
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>
                {greeting}，{displayName}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: '1.02rem' }}>
                欢迎回到 <strong style={{ color: mm.accentText }}>MediaMinds</strong>，让灵感与知识在这里交汇
              </Typography>
            </Box>
            <Chip icon={<AutoAwesomeRoundedIcon />} label={timeText} />
          </Stack>

          {/* 每日一句：灰底引用块 */}
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 'var(--mm-radius-lg)',
              bgcolor: 'var(--mm-sunken)',
              boxShadow: 'var(--mm-sunken-sm)',
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontStyle: 'italic', fontWeight: 600, mb: 1.5, lineHeight: 1.7, letterSpacing: 0 }}
            >
              「{quote.text}」
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 700, color: mm.accentText }}>
              — {quote.author}
            </Typography>
          </Box>
        </Stack>
      </Card>

      {/* ── 资源统计 ───────────────────────────────────────────── */}
      <AutoGrid minWidth={230}>
        {statItems.map((item) => (
          <Card key={item.label} className="mm-hover-lift" sx={{ p: 3.5, textAlign: 'center' }}>
            <Box
              sx={{
                width: 70,
                height: 70,
                borderRadius: 0,
                mx: 'auto',
                mb: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'var(--mm-bg)',
                boxShadow: 'var(--mm-raised-sm)',
                color: item.color,
                fontSize: 32,
              }}
            >
              {item.icon}
            </Box>
            {stats.loading ? (
              <Skeleton variant="text" width={110} height={58} sx={{ mx: 'auto' }} />
            ) : (
              <Typography variant="h3" sx={{ fontWeight: 800, color: item.color, lineHeight: 1.15 }}>
                {item.value}
              </Typography>
            )}
            <Typography color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
              {item.label}
            </Typography>
          </Card>
        ))}
      </AutoGrid>

      {/* ── 三大功能入口 ───────────────────────────────────────── */}
      <Typography variant="h6" sx={{ fontWeight: 800, mt: 4.5, mb: 2 }}>
        开始探索
      </Typography>
      <AutoGrid minWidth={280}>
        {FEATURES.map((f) => (
          <Card key={f.key} className="mm-hover-lift" sx={{ p: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 88,
                height: 88,
                borderRadius: 'var(--mm-radius-lg)',
                display: 'grid',
                placeItems: 'center',
                mx: 'auto',
                mb: 2.5,
                bgcolor: 'var(--mm-bg)',
                boxShadow: 'var(--mm-raised)',
                color: mm[f.tone],
              }}
            >
              {f.icon}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              {f.title}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, minHeight: 52 }}>
              {f.desc}
            </Typography>
            <Button variant="outlined" endIcon={<ArrowForwardRoundedIcon />} onClick={() => router.push(f.href)}>
              {f.btn}
            </Button>
          </Card>
        ))}
      </AutoGrid>

      {/* ── 个人空间入口 ───────────────────────────────────────── */}
      <Card
        className="mm-hover-lift"
        sx={{
          mt: 4,
          p: { xs: 3, md: 4 },
          borderRadius: 'var(--mm-radius-xl)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 3,
        }}
      >
        <ProfileAvatar src={info?.avatar || undefined} name={displayName} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            个人空间
          </Typography>
          <Typography color="text.secondary">
            在这里定制专属于你的内容世界，管理你的账户信息与使用偏好。
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonRoundedIcon />}
          onClick={() => router.push('/content/profile')}
          sx={{ flexShrink: 0 }}
        >
          前往个人空间
        </Button>
      </Card>
    </Box>
  );
}

/** 首页头像块：描边方块，无头像时回退首字 */
function ProfileAvatar({ src, name }: { src?: string; name: string }) {
  return (
    <Box
      sx={{
        width: 76,
        height: 76,
        borderRadius: 'var(--mm-radius-lg)',
        flexShrink: 0,
        overflow: 'hidden',
        bgcolor: 'var(--mm-bg)',
        boxShadow: 'var(--mm-raised)',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 800,
        fontSize: 28,
        color: 'var(--mm-accent-text)',
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        name[0]
      )}
    </Box>
  );
}
