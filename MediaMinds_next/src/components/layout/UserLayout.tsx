'use client';

import { ReactNode, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import AppShell, { type RailItem } from '@/components/layout/AppShell';
import GlobalMusicPlayer from '@/components/layout/GlobalMusicPlayer';
import { useAuthStore } from '@/stores/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const TITLES: Record<string, string> = {
  '/content': '首页',
  '/content/book': '图书浏览',
  '/content/video': '视频浏览',
  '/content/music': '音乐浏览',
  '/content/agent': '智能入库',
  '/content/profile': '个人信息',
};

const ITEMS: RailItem[] = [
  { kind: 'link', label: '首页', href: '/content', icon: <HomeRoundedIcon /> },
  { kind: 'link', label: '图书浏览', href: '/content/book', icon: <MenuBookRoundedIcon /> },
  { kind: 'link', label: '视频浏览', href: '/content/video', icon: <MovieRoundedIcon /> },
  { kind: 'link', label: '音乐浏览', href: '/content/music', icon: <HeadphonesRoundedIcon /> },
  { kind: 'link', label: '智能入库', href: '/content/agent', icon: <SmartToyRoundedIcon /> },
  { kind: 'link', label: '个人信息', href: '/content/profile', icon: <AccountCircleRoundedIcon /> },
];

export default function UserLayout({ children }: { children: ReactNode }) {
  useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();

  const info = useAuthStore((s) => s.info);
  const logout = useAuthStore((s) => s.logout);

  const title = useMemo(() => {
    const match = Object.keys(TITLES)
      .filter((k) => pathname === k || pathname.startsWith(k + '/'))
      .sort((a, b) => b.length - a.length)[0];
    return TITLES[match] || 'MediaMinds';
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <AppShell
      items={ITEMS}
      homeHref="/content"
      title={title}
      subtitle="MediaMinds · 智能书影音"
      maxWidth={1500}
      user={{
        name: info?.nickName || info?.userName || '用户',
        avatar: info?.avatar || undefined,
      }}
      onProfile={() => router.push('/content/profile')}
      onLogout={handleLogout}
      player={<GlobalMusicPlayer />}
    >
      <Box>{children}</Box>
    </AppShell>
  );
}
