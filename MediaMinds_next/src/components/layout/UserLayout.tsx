'use client';

import { useMemo } from 'react';
import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import AppShell, { type RailItem } from '@/components/layout/AppShell';
import GlobalMusicPlayer from '@/components/layout/GlobalMusicPlayer';
import { useAuthStore } from '@/stores/authStore';
import { useRequireAuth } from '@/hooks/useRequireAuth';

/** 每条路由的标题与副标题 */
const META: Record<string, { title: string; subtitle: string }> = {
  '/content': { title: '首页', subtitle: '你的书影音总览' },
  '/content/book': { title: '图书浏览', subtitle: '在文字里漫游' },
  '/content/video': { title: '视频浏览', subtitle: '在影像里穿行' },
  '/content/music': { title: '音乐浏览', subtitle: '在旋律里停留' },
  '/content/music/playing': { title: '正在播放', subtitle: '当前播放的歌曲' },
  '/content/agent': { title: '智能收藏', subtitle: '用一句话把内容收进收藏' },
  '/content/stats': { title: '时长统计', subtitle: '你在 MediaMinds 上花掉的时间' },
  '/content/profile': { title: '个人信息', subtitle: '管理你的账户与偏好' },
};

const ITEMS: RailItem[] = [
  { kind: 'link', label: '首页', href: '/content', icon: <HomeRoundedIcon /> },
  { kind: 'link', label: '图书浏览', href: '/content/book', icon: <MenuBookRoundedIcon /> },
  { kind: 'link', label: '视频浏览', href: '/content/video', icon: <MovieRoundedIcon /> },
  { kind: 'link', label: '音乐浏览', href: '/content/music', icon: <HeadphonesRoundedIcon /> },
  { kind: 'link', label: '智能收藏', href: '/content/agent', icon: <SmartToyRoundedIcon /> },
  { kind: 'link', label: '时长统计', href: '/content/stats', icon: <InsightsRoundedIcon /> },
];

export default function UserLayout({ children }: { children: ReactNode }) {
  useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();

  const info = useAuthStore((s) => s.info);
  const logout = useAuthStore((s) => s.logout);

  const meta = useMemo(() => {
    const match = Object.keys(META)
      .filter((k) => pathname === k || pathname.startsWith(k + '/'))
      .sort((a, b) => b.length - a.length)[0];
    return META[match] ?? { title: 'MediaMinds', subtitle: '智能书影音' };
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <AppShell
      items={ITEMS}
      homeHref="/content"
      title={meta.title}
      subtitle={meta.subtitle}
      maxWidth={1500}
      user={{
        name: info?.nickName || info?.userName || '用户',
        avatar: info?.avatar || undefined,
        caption: info?.email || '个人空间',
      }}
      onProfile={() => router.push('/content/profile')}
      onLogout={handleLogout}
      player={<GlobalMusicPlayer />}
    >
      {children}
    </AppShell>
  );
}
