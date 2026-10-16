'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { buildTheme } from '@/lib/theme';
import { applyThemeAttr, writeThemeCookie, type ThemeMode } from '@/lib/themeCookie';
import { ThemeModeContext } from '@/lib/themeMode';
import NotificationProvider from '@/components/NotificationProvider';
import ConfirmProvider from '@/components/common/ConfirmProvider';
import AuthBootstrap from '@/components/AuthBootstrap';
import RouteProgress from '@/components/RouteProgress';

/**
 * 全局 Provider 树。
 *
 * `initialMode` 由服务端从 cookie 读取后传入，因此 SSR 与客户端首帧主题完全一致，
 * 不会出现「先亮后暗」的闪烁，也没有水合不一致告警。
 */
export default function Providers({
  children,
  initialMode = 'light',
}: {
  children: ReactNode;
  initialMode?: ThemeMode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeThemeCookie(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      writeThemeCookie(next);
      return next;
    });
  }, []);

  useEffect(() => {
    applyThemeAttr(mode);
  }, [mode]);

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const ctx = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);

  return (
    <ThemeModeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouteProgress />
        <AuthBootstrap />
        <ConfirmProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
