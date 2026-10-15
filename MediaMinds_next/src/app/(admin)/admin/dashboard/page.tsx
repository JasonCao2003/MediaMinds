'use client';

import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Divider,
  Skeleton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import type { EChartsOption } from 'echarts';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EChart from '@/components/common/EChart';
import AutoGrid from '@/components/common/AutoGrid';
import PageHeader from '@/components/common/PageHeader';
import { tokens, tintGradients } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { getDashboardStatsService, getContentCategoryService, getUserGrowthService } from '@/api/admin';

interface UserRow {
  createdAt?: string;
  [key: string]: unknown;
}

export default function AdminDashboardPage() {
  const theme = useTheme();
  const info = useAuthStore((s) => s.info);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalContent: 0,
    newContents: 0,
  });
  const [details, setDetails] = useState({ songs: 0, movies: 0, books: 0 });
  const [growth, setGrowth] = useState<{ months: string[]; newUsers: number[]; cumulative: number[] }>({
    months: [],
    newUsers: [],
    cumulative: [],
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dash, category, users] = await Promise.all([
          getDashboardStatsService(),
          getContentCategoryService(),
          getUserGrowthService(),
        ]);
        if (!alive) return;
        setStats({
          totalUsers: dash.totalUsers,
          activeUsers: dash.activeUsers,
          totalContent: dash.totalContent,
          newContents: Math.round(dash.totalContent * 0.05),
        });
        setDetails({
          songs: category.songs ?? 0,
          movies: category.movies ?? 0,
          books: category.books ?? 0,
        });

        const list =
          (users as { data?: { list?: UserRow[]; records?: UserRow[] } }).data?.list ||
          (users as { data?: { list?: UserRow[]; records?: UserRow[] } }).data?.records ||
          [];
        setGrowth(processGrowth(Array.isArray(list) ? list : []));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const statCards = [
    { label: '总用户数', value: stats.totalUsers, icon: <GroupRoundedIcon />, color: theme.palette.primary.main },
    { label: '活跃用户', value: stats.activeUsers, icon: <TimelineRoundedIcon />, color: theme.palette.success.main },
    { label: '内容总数', value: stats.totalContent, icon: <AutoStoriesRoundedIcon />, color: theme.palette.warning.main },
    { label: '本周新增', value: stats.newContents, icon: <AddCircleRoundedIcon />, color: theme.palette.secondary.main },
  ];

  const contentItems = [
    { label: '音乐资源', value: details.songs, icon: <HeadphonesRoundedIcon />, color: '#2563EB' },
    { label: '视频资源', value: details.movies, icon: <MovieRoundedIcon />, color: '#D97706' },
    { label: '图书资源', value: details.books, icon: <MenuBookRoundedIcon />, color: '#0D9488' },
  ];

  const pieOption: EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, icon: 'circle' },
    color: ['#7C7FF2', '#E0B15A', '#5FD0B0'],
    series: [
      {
        name: '内容分布',
        type: 'pie',
        radius: ['42%', '70%'],
        itemStyle: { borderRadius: 10, borderColor: tokens.surface, borderWidth: 3 },
        label: { formatter: '{b}\n{c} ({d}%)' },
        data: [
          { value: details.songs, name: '音乐' },
          { value: details.movies, name: '视频' },
          { value: details.books, name: '图书' },
        ],
      },
    ],
  };

  const lineOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['月度新增用户', '累计用户数'], bottom: 0, icon: 'circle' },
    grid: { left: 8, right: 16, bottom: 48, top: 24, containLabel: true },
    xAxis: { type: 'category', data: growth.months, boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '月度新增用户',
        type: 'line',
        data: growth.newUsers,
        color: theme.palette.primary.main,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 2 },
      },
      {
        name: '累计用户数',
        type: 'line',
        data: growth.cumulative,
        color: theme.palette.success.main,
        smooth: true,
        symbol: 'emptyCircle',
        symbolSize: 7,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.1 },
      },
    ],
  };

  return (
    <Box>
      <PageHeader
        title={`欢迎回来，${info?.nickName || '管理员'}`}
        subtitle="这里是 MediaMinds 系统概览"
        icon={<AutoStoriesRoundedIcon />}
      />

      <AutoGrid minWidth={200}>
        {statCards.map((c) => (
          <Card key={c.label} className="mm-hover-lift" sx={{ bgcolor: tokens.surfaceAlt, backgroundImage: 'none' }}>
            <CardContent sx={{ py: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ color: c.color, display: 'flex', '& svg': { fontSize: 18 } }}>{c.icon}</Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {c.label}
                </Typography>
              </Box>
              {loading ? (
                <Skeleton variant="text" width={70} sx={{ fontSize: '2.4rem' }} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, letterSpacing: '-0.03em' }}>
                  {c.value}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </AutoGrid>

      <Card sx={{ mt: 3, borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            内容明细
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <AutoGrid minWidth={220}>
            {contentItems.map((item) => (
              <Box
                key={item.label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: '18px',
                  border: `1px solid ${tokens.border}`,
                  bgcolor: tokens.surfaceAlt,
                }}
              >
                <Avatar sx={{ bgcolor: alpha(item.color, 0.16), color: item.color }}>{item.icon}</Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </Box>
              </Box>
            ))}
          </AutoGrid>
        </CardContent>
      </Card>

      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 3,
        }}
      >
        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              用户增长趋势
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <EChart option={lineOption} height={360} />
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              内容分类统计
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <EChart option={pieOption} height={360} />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function processGrowth(users: UserRow[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const months: string[] = [];
  const newUsers = Array(12).fill(0);

  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth - 11 + i + 12) % 12;
    const yearOffset = Math.floor((currentMonth - 11 + i) / 12);
    months.push(`${currentYear + yearOffset}年${monthIndex + 1}月`);
  }

  let initial = 0;
  users.forEach((u) => {
    const raw = u.createdAt || (u.createTime as string | undefined);
    if (!raw) return;
    const date = new Date(raw as string);
    if (Number.isNaN(date.getTime())) return;
    const diff = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
    if (diff >= 12) initial++;
    else if (diff >= 0) newUsers[11 - diff]++;
  });

  let total = initial;
  const cumulative = newUsers.map((n) => {
    total += n;
    return total;
  });

  return { months, newUsers, cumulative };
}
