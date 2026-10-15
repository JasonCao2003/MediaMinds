'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
import { tokens } from '@/lib/theme';

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
  /** 图标轨道导航项 */
  items: RailItem[];
  /** 点击品牌标识跳转地址 */
  homeHref: string;
  /** 页面主标题 */
  title: ReactNode;
  /** 标题下方的副标题 */
  subtitle?: ReactNode;
  /** 顶栏右侧自定义操作区（通知、返回等） */
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
 * MediaMinds 应用外壳
 *
 * 布局：近黑背景上浮一层大圆角面板，左侧为纯图标轨道（悬停显示提示，
 * 分组项悬停弹出子菜单），右侧为顶栏 + 可滚动内容区。
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
  const [groupAnchor, setGroupAnchor] = useState<null | HTMLElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenGroup(null), 180);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const railButtonSx = (active: boolean) => ({
    width: 46,
    height: 46,
    borderRadius: '14px',
    color: active ? tokens.accent : tokens.textSecondary,
    bgcolor: active ? tokens.accentSoft : 'transparent',
    '&:hover': {
      bgcolor: active ? 'rgba(124,127,242,.24)' : 'rgba(255,255,255,.06)',
      color: active ? tokens.accent : tokens.textPrimary,
    },
  });

  const brand = (
    <Tooltip title="MediaMinds" placement="right">
      <Box
        onClick={() => router.push(homeHref)}
        sx={{
          width: 46,
          height: 46,
          borderRadius: '16px',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          color: '#fff',
          fontWeight: 800,
          fontSize: 20,
          background: 'linear-gradient(140deg, #7C7FF2 0%, #8B5CF6 100%)',
          boxShadow: '0 12px 26px -12px rgba(124,127,242,.9)',
        }}
      >
        M
      </Box>
    </Tooltip>
  );

  const navItems = useMemo(
    () =>
      items.map((item, idx) => {
        if (item.kind === 'link') {
          const active = isActive(item.href);
          return (
            <Tooltip key={item.href + idx} title={item.label} placement="right">
              <IconButton
                aria-label={item.label}
                onClick={() => router.push(item.href)}
                sx={railButtonSx(active)}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        }
        const groupActive = item.children.some((c) => isActive(c.href));
        return (
          <Box
            key={item.label + idx}
            onMouseEnter={(e) => {
              cancelClose();
              setGroupAnchor(e.currentTarget);
              setOpenGroup(item.label);
            }}
            onMouseLeave={scheduleClose}
          >
            <IconButton
              aria-label={item.label}
              onClick={() => router.push(item.children[0].href)}
              sx={railButtonSx(groupActive)}
            >
              {item.icon}
            </IconButton>
          </Box>
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, pathname],
  );

  const activeGroup = items.find((i) => i.kind === 'group' && i.label === openGroup) as RailGroup | undefined;

  const rail = (
    <Box
      sx={{
        width: 76,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        py: 2.5,
        px: 1,
        borderRight: `1px solid ${tokens.border}`,
      }}
    >
      {brand}
      <Divider sx={{ width: 32, my: 0.5 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>{navItems}</Box>
      <Box sx={{ flex: 1 }} />
      <Tooltip title="退出登录" placement="right">
        <IconButton aria-label="退出登录" onClick={onLogout} sx={railButtonSx(false)}>
          <LogoutRoundedIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const userMenu = (
    <>
      <Box
        onClick={(e) => setUserAnchor(e.currentTarget)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          pl: 0.5,
          pr: 1,
          py: 0.5,
          borderRadius: 999,
          cursor: 'pointer',
          transition: 'background-color 180ms',
          '&:hover': { bgcolor: 'rgba(255,255,255,.05)' },
        }}
      >
        <Avatar src={user.avatar || undefined} sx={{ width: 36, height: 36, fontWeight: 700 }}>
          {user.name?.[0] || 'U'}
        </Avatar>
        <Box sx={{ display: { xs: 'none', lg: 'block' }, lineHeight: 1.2, maxWidth: 180 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {user.name}
          </Typography>
          {user.caption && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {user.caption}
            </Typography>
          )}
        </Box>
        <KeyboardArrowDownRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </Box>
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
    </>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        p: { xs: 0, md: 1.5 },
      }}
    >
      <Box
        className="mm-shell"
        sx={{
          flex: 1,
          display: 'flex',
          minWidth: 0,
          height: { xs: '100vh', md: 'calc(100vh - 24px)' },
          borderRadius: { xs: 0, md: '28px' },
          overflow: 'hidden',
        }}
      >
        {/* 桌面端图标轨道 */}
        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>{rail}</Box>

        {/* 移动端抽屉 */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              sx: {
                width: 240,
                bgcolor: tokens.shell,
                borderRight: `1px solid ${tokens.border}`,
                p: 1.5,
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 1.5 }}>
            {brand}
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              MediaMinds
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <List disablePadding>
            {items.map((item, idx) =>
              item.kind === 'link' ? (
                <ListItemButton
                  key={item.href + idx}
                  selected={isActive(item.href)}
                  onClick={() => router.push(item.href)}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ) : (
                <Box key={item.label + idx}>
                  <ListItemButton onClick={() => router.push(item.children[0].href)}>
                    <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                  <Box sx={{ pl: 3 }}>
                    {item.children.map((c) => (
                      <ListItemButton key={c.href} selected={isActive(c.href)} onClick={() => router.push(c.href)}>
                        {c.icon && <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>{c.icon}</ListItemIcon>}
                        <ListItemText primary={c.label} />
                      </ListItemButton>
                    ))}
                  </Box>
                </Box>
              ),
            )}
          </List>
        </Drawer>

        {/* 主区域 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: { xs: 2, md: 3.5 },
              py: 2,
              minHeight: 76,
              borderBottom: `1px solid ${tokens.border}`,
            }}
          >
            {!isDesktop && (
              <IconButton aria-label="打开导航" onClick={() => setMobileOpen(true)} edge="start">
                <MenuRoundedIcon />
              </IconButton>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}
                noWrap
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1 }} />
            {headerActions}
            {userMenu}
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <Box
              className="mm-fade-in"
              sx={{
                px: { xs: 2, md: 3.5 },
                py: 3,
                maxWidth,
                mx: 'auto',
                pb: player ? 14 : 5,
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 分组悬停子菜单 */}
      <Menu
        anchorEl={groupAnchor}
        open={Boolean(activeGroup)}
        onClose={() => setOpenGroup(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        MenuListProps={{
          onMouseEnter: cancelClose,
          onMouseLeave: scheduleClose,
          sx: { minWidth: 190, py: 1 },
        }}
      >
        <Typography
          variant="caption"
          sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}
        >
          {activeGroup?.label}
        </Typography>
        {activeGroup?.children.map((c) => (
          <MenuItem
            key={c.href}
            selected={isActive(c.href)}
            onClick={() => {
              setOpenGroup(null);
              router.push(c.href);
            }}
          >
            {c.icon && <ListItemIcon sx={{ minWidth: 34 }}>{c.icon}</ListItemIcon>}
            {c.label}
          </MenuItem>
        ))}
      </Menu>

      {player}
    </Box>
  );
}
