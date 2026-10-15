'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Badge, Box, IconButton, Tooltip } from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import AppShell, { type RailItem } from '@/components/layout/AppShell';
import GlobalMusicPlayer from '@/components/layout/GlobalMusicPlayer';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import websocketService from '@/lib/websocket';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const TITLES: Record<string, string> = {
  '/content': '首页',
  '/content/book': '图书浏览',
  '/content/video': '视频浏览',
  '/content/music': '音乐浏览',
  '/content/agent': '智能入库',
  '/content/message': '消息中心',
  '/content/profile': '个人信息',
};

export default function UserLayout({ children }: { children: ReactNode }) {
  useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();

  const info = useAuthStore((s) => s.info);
  const logout = useAuthStore((s) => s.logout);
  const messages = useMessageStore((s) => s.messages);
  const markAllRead = useMessageStore((s) => s.markAllRead);

  const unread = useMemo(() => messages.filter((m) => !m.read).length, [messages]);

  const title = useMemo(() => {
    const match = Object.keys(TITLES)
      .filter((k) => pathname === k || pathname.startsWith(k + '/'))
      .sort((a, b) => b.length - a.length)[0];
    return TITLES[match] || 'MediaMinds';
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/content/message') {
      websocketService.sendMessage('/app/mark-read', {
        userId: info?.userId,
        action: 'mark_all_read',
      });
      markAllRead();
    }
  }, [pathname, info?.userId, markAllRead]);

  const handleLogout = () => {
    websocketService.disconnect();
    logout();
    router.replace('/login');
  };

  const items: RailItem[] = [
    { kind: 'link', label: '首页', href: '/content', icon: <HomeRoundedIcon /> },
    { kind: 'link', label: '图书浏览', href: '/content/book', icon: <MenuBookRoundedIcon /> },
    { kind: 'link', label: '视频浏览', href: '/content/video', icon: <MovieRoundedIcon /> },
    { kind: 'link', label: '音乐浏览', href: '/content/music', icon: <HeadphonesRoundedIcon /> },
    { kind: 'link', label: '智能入库', href: '/content/agent', icon: <SmartToyRoundedIcon /> },
    { kind: 'link', label: '消息中心', href: '/content/message', icon: <NotificationsRoundedIcon /> },
    { kind: 'link', label: '个人信息', href: '/content/profile', icon: <AccountCircleRoundedIcon /> },
  ];

  return (
    <AppShell
      items={items}
      homeHref="/content"
      title={title}
      subtitle="MediaMinds · 智能书影音"
      headerActions={
        <Tooltip title="消息中心">
          <IconButton onClick={() => router.push('/content/message')} aria-label="消息中心">
            <Badge badgeContent={unread} color="secondary" max={99}>
              <NotificationsRoundedIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      }
      user={{
        name: info?.nickName || info?.userName || '用户',
        avatar: info?.avatar || undefined,
        caption: '普通用户',
      }}
      onProfile={() => router.push('/content/profile')}
      onLogout={handleLogout}
      player={<GlobalMusicPlayer />}
    >
      <Box>{children}</Box>
    </AppShell>
  );
}
