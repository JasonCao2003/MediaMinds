'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  List,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ThemeToggle from '@/components/common/ThemeToggle';
import BrandLogo from '@/components/BrandLogo';
import AudioEngine from '@/components/layout/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';

export interface RailLink {
  kind: 'link';
  label: string;
  href: string;
  icon: ReactNode;
}

export interface RailGroup {
  kind: 'group';
  label: string;
  icon: ReactNode;
  children: Array<{ label: string; href: string; icon?: ReactNode }>;
}

export type RailItem = RailLink | RailGroup;

export interface AppShellProps {
  /** 侧边导航项 */
  items: RailItem[];
  /** 点击品牌标识跳转地址 */
  homeHref: string;
  /** 页面主标题 */
  title: ReactNode;
  /** 标题下方的副标题 */
  subtitle?: ReactNode;
  /** 顶栏右侧自定义操作区 */
  headerActions?: ReactNode;
  /** 当前用户信息 */
  user: { name: string; avatar?: string; caption?: string };
  onProfile?: () => void;
  onLogout: () => void;
  /** 底部全局播放器（仅用户端） */
  player?: ReactNode;
  /** 内容区最大宽度 */
  maxWidth?: number;
  children: ReactNode;
}

/**
 * MediaMinds 应用外壳（Neumorphism）
 *
 * 布局：整页铺可见网格，左侧导航是带描边的实心面板，选中项整体反白。
 * 顶栏是标题区，右侧放主题开关与用户菜单。
 */
export default function AppShell({
  items,
  homeHref,
  title,
  subtitle,
  headerActions,
  user,
  onProfile,
  onLogout,
  player,
  maxWidth = 1440,
  children,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);

  // 播放器只有歌单非空时才真正渲染，所以这里直接订阅 store 判断
  // （AppShell 的 player prop 永远是 truthy 的 React 元素，无法据此判断）
  const playlistCount = usePlayerStore((s) => s.playlist.length);
  const hasPlayer = Boolean(player) && playlistCount > 0;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const navItemSx = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    width: '100%',
    height: 50,
    px: 1.75,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    fontWeight: 800,
    letterSpacing: '0.02em',
    textAlign: 'left',
    borderRadius: 0,
    // Brutalism：选中项整体反白，不靠颜色渐变表达
    bgcolor: active ? 'var(--mm-text)' : 'transparent',
    color: active ? 'var(--mm-bg)' : 'var(--mm-text-2)',
    '&:hover': {
      bgcolor: active ? 'var(--mm-text)' : 'var(--mm-sunken)',
      color: active ? 'var(--mm-bg)' : 'var(--mm-text)',
    },
    '&:active': { transform: 'translate(2px, 2px)' },
  });

  const navItems = useMemo(
    () =>
      items.map((item, idx) => {
        if (item.kind === 'link') {
          const active = isActive(item.href);
          return (
            <Box
              key={item.href + idx}
              component="button"
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => router.push(item.href)}
              sx={navItemSx(active)}
            >
              <Box sx={{ display: 'grid', placeItems: 'center', width: 26, flexShrink: 0 }}>{item.icon}</Box>
              <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </Box>
              {active && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    bgcolor: 'currentColor',
                    flexShrink: 0,
                  }}
                />
              )}
            </Box>
          );
        }
        const groupActive = item.children.some((c) => isActive(c.href));
        return (
          <Box key={item.label + idx}>
            <Box
              component="button"
              type="button"
              onClick={() => router.push(item.children[0].href)}
              sx={navItemSx(groupActive)}
            >
              <Box sx={{ display: 'grid', placeItems: 'center', width: 26, flexShrink: 0 }}>{item.icon}</Box>
              <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </Box>
            </Box>
            <Box sx={{ pl: 3, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {item.children.map((c) => (
                <Box
                  key={c.href}
                  component="button"
                  type="button"
                  onClick={() => router.push(c.href)}
                  sx={navItemSx(isActive(c.href))}
                >
                  <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.label}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, pathname],
  );

  /** 用户信息块：侧边栏底部的描边名牌 */
  const userCard = (
    <Box
      onClick={(e) => setUserAnchor(e.currentTarget)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.25,
        borderRadius: 'var(--mm-radius-lg)',
        cursor: 'pointer',
        bgcolor: 'var(--mm-bg)',
        boxShadow: 'var(--mm-sunken-sm)',
        '&:hover': { boxShadow: 'var(--mm-sunken)' },
      }}
    >
      <Avatar src={user.avatar || undefined} sx={{ width: 40, height: 40, fontWeight: 700 }}>
        {user.name?.[0] || 'U'}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
          {user.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {user.caption || '个人空间'}
        </Typography>
      </Box>
      <KeyboardArrowDownRoundedIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
    </Box>
  );

  const sidebar = (
    <Box
      sx={{
        width: 'var(--mm-sidebar-width)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 2,
        borderRadius: 'var(--mm-radius-xl)',
        bgcolor: 'var(--mm-bg)',
        boxShadow: 'var(--mm-raised-lg)',
      }}
    >
      <Box
        onClick={() => router.push(homeHref)}
        sx={{ px: 1, py: 1.5, cursor: 'pointer', borderRadius: 'var(--mm-radius)' }}
      >
        <BrandLogo size={40} />
      </Box>

      <Divider sx={{ mx: 1.5, my: 1 }} />

      <Box
        component="nav"
        aria-label="主导航"
        sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1, minHeight: 0, overflowY: 'auto' }}
      >
        {navItems}
      </Box>

      {/* 播放器：单行控制条，紧贴用户名片**上方** */}
      {hasPlayer && (
        <Box sx={{ px: 0.5, pt: 1, borderTop: '2px solid var(--mm-border-color)' }}>{player}</Box>
      )}

      {userCard}
    </Box>
  );

  const userMenu = (
    <Menu
      anchorEl={userAnchor}
      open={Boolean(userAnchor)}
      onClose={() => setUserAnchor(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      {onProfile && (
        <MenuItem
          onClick={() => {
            setUserAnchor(null);
            onProfile();
          }}
        >
          <ListItemIcon>
            <PersonRoundedIcon fontSize="small" />
          </ListItemIcon>
          个人信息
        </MenuItem>
      )}
      <MenuItem
        onClick={() => {
          setUserAnchor(null);
          onLogout();
        }}
        sx={{ color: 'error.main' }}
      >
        <ListItemIcon>
          <LogoutRoundedIcon fontSize="small" color="error" />
        </ListItemIcon>
        退出登录
      </MenuItem>
    </Menu>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        gap: { xs: 0, md: 2.5 },
        p: { xs: 0, md: 2.5 },
        bgcolor: 'var(--mm-bg)',
      }}
    >
      {/* 桌面端侧边栏 */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, position: 'sticky', top: 20, alignSelf: 'flex-start', height: 'calc(100vh - 40px)' }}>
        {sidebar}
      </Box>

      {/* 移动端抽屉 */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: { width: 268, p: 2, bgcolor: 'var(--mm-bg)' } } }}
      >
        <Box onClick={() => router.push(homeHref)} sx={{ px: 1, py: 1.5, cursor: 'pointer' }}>
          <BrandLogo size={40} />
        </Box>
        <Divider sx={{ mx: 1.5, my: 1 }} />
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {items.map((item, idx) =>
            item.kind === 'link' ? (
              <ListItemButton
                key={item.href + idx}
                selected={isActive(item.href)}
                onClick={() => router.push(item.href)}
                sx={{ height: 50, borderRadius: 'var(--mm-radius)' }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700, fontSize: '0.94rem' }} />
              </ListItemButton>
            ) : (
              <Box key={item.label + idx}>
                <ListItemButton
                  onClick={() => router.push(item.children[0].href)}
                  sx={{ height: 50, borderRadius: 'var(--mm-radius)' }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700 }} />
                </ListItemButton>
                <Box sx={{ pl: 3 }}>
                  {item.children.map((c) => (
                    <ListItemButton
                      key={c.href}
                      selected={isActive(c.href)}
                      onClick={() => router.push(c.href)}
                      sx={{ height: 46, borderRadius: 'var(--mm-radius)' }}
                    >
                      <ListItemText primary={c.label} />
                    </ListItemButton>
                  ))}
                </Box>
              </Box>
            ),
          )}
        </List>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ mt: 2 }}>{userCard}</Box>
      </Drawer>

      {/* 主区域 */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: { xs: '100vh', md: 'calc(100vh - 40px)' },
          borderRadius: { xs: 0, md: 'var(--mm-radius-xl)' },
          bgcolor: 'var(--mm-bg)',
          boxShadow: { xs: 'none', md: 'var(--mm-raised-lg)' },
          overflow: 'hidden',
        }}
      >
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, md: 2 },
            px: { xs: 2, md: 3.5 },
            pt: { xs: 2.5, md: 3 },
            pb: { xs: 1.5, md: 1.5 },
            flexShrink: 0,
          }}
        >
          {!isDesktop && (
            <IconButton aria-label="打开导航" onClick={() => setMobileOpen(true)} edge="start">
              <MenuRoundedIcon />
            </IconButton>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}
              noWrap
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {headerActions}
          <ThemeToggle compact={!isDesktop} />
          {!isDesktop && (
            <Tooltip title="账户">
              <IconButton aria-label="账户菜单" onClick={(e) => setUserAnchor(e.currentTarget)}>
                <Avatar src={user.avatar || undefined} sx={{ width: 26, height: 26, fontSize: '0.8rem' }}>
                  {user.name?.[0] || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <Box
            className="mm-fade-in"
            sx={{
              px: { xs: 2, md: 3.5 },
              py: { xs: 2.5, md: 3 },
              maxWidth,
              mx: 'auto',
              // 桌面端播放器停靠在侧边栏里，不再遮挡内容；
              // 移动端播放器是贴底面板，需要给内容留出让位空间（否则会压住分页器）
              pb: hasPlayer ? { xs: `calc(var(--mm-player-height) + 24px)`, md: 5 } : 5,
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>

      {userMenu}

      {/* 移动端没有侧边栏，播放器退化为贴底条 */}
      {hasPlayer && (
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: (t) => t.zIndex.appBar + 1,
            alignItems: 'center',
            bgcolor: 'var(--mm-bg)',
            borderTop: '2px solid var(--mm-border-color)',
            px: 2,
            py: 1,
          }}
        >
          {player}
        </Box>
      )}

      {/* 全局唯一的音频元素 */}
      <AudioEngine />
    </Box>
  );
}
