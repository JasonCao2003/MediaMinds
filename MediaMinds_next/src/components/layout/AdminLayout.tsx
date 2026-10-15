'use client';

import { ReactNode, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IconButton, Tooltip } from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import AlbumRoundedIcon from '@mui/icons-material/AlbumRounded';
import PlaylistPlayRoundedIcon from '@mui/icons-material/PlaylistPlayRounded';
import CommentRoundedIcon from '@mui/icons-material/CommentRounded';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AppShell, { type RailItem } from '@/components/layout/AppShell';
import { useAuthStore } from '@/stores/authStore';
import websocketService from '@/lib/websocket';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const ITEMS: RailItem[] = [
  { kind: 'link', label: '控制面板', href: '/admin/dashboard', icon: <DashboardRoundedIcon /> },
  {
    kind: 'group',
    label: '图书管理',
    icon: <MenuBookRoundedIcon />,
    children: [
      { label: '图书管理', href: '/admin/book/manage', icon: <MenuBookRoundedIcon fontSize="small" /> },
      { label: '图书类型', href: '/admin/book/type', icon: <CategoryRoundedIcon fontSize="small" /> },
      { label: '章节管理', href: '/admin/book/chapter', icon: <ArticleRoundedIcon fontSize="small" /> },
    ],
  },
  {
    kind: 'group',
    label: '音乐管理',
    icon: <HeadphonesRoundedIcon />,
    children: [
      { label: '歌曲管理', href: '/admin/music/songs', icon: <LibraryMusicRoundedIcon fontSize="small" /> },
      { label: '歌手管理', href: '/admin/music/singers', icon: <AlbumRoundedIcon fontSize="small" /> },
      { label: '歌单管理', href: '/admin/music/songlists', icon: <PlaylistPlayRoundedIcon fontSize="small" /> },
      { label: '评论管理', href: '/admin/music/comments', icon: <CommentRoundedIcon fontSize="small" /> },
    ],
  },
  {
    kind: 'group',
    label: '视频管理',
    icon: <MovieRoundedIcon />,
    children: [
      { label: '电影管理', href: '/admin/video/movies', icon: <LocalMoviesRoundedIcon fontSize="small" /> },
      { label: '分类管理', href: '/admin/video/categories', icon: <SellRoundedIcon fontSize="small" /> },
      { label: '评论管理', href: '/admin/video/comments', icon: <ChatBubbleRoundedIcon fontSize="small" /> },
    ],
  },
  { kind: 'link', label: '用户管理', href: '/admin/users', icon: <GroupRoundedIcon /> },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();

  const info = useAuthStore((s) => s.info);
  const logout = useAuthStore((s) => s.logout);

  const breadcrumb = useMemo(() => {
    for (const item of ITEMS) {
      if (item.kind === 'group') {
        const child = item.children.find((c) => pathname.startsWith(c.href));
        if (child) return `${item.label} / ${child.label}`;
      }
    }
    const map: Record<string, string> = {
      '/admin/dashboard': '控制面板',
      '/admin/users': '用户管理',
    };
    return map[pathname] || '管理后台';
  }, [pathname]);

  const handleLogout = () => {
    websocketService.disconnect();
    logout();
    router.replace('/login');
  };

  return (
    <AppShell
      items={ITEMS}
      homeHref="/admin/dashboard"
      title={breadcrumb}
      subtitle="管理后台"
      maxWidth={1500}
      headerActions={
        <Tooltip title="返回内容端">
          <IconButton onClick={() => router.push('/content')} aria-label="返回内容端">
            <HomeRoundedIcon />
          </IconButton>
        </Tooltip>
      }
      user={{
        name: info?.nickName || info?.userName || '管理员',
        avatar: info?.avatar || undefined,
        caption: '系统管理员',
      }}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}
