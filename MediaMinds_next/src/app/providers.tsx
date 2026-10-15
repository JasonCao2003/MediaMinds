'use client';

import { useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { buildTheme } from '@/lib/theme';
import NotificationProvider from '@/components/NotificationProvider';
import ConfirmProvider from '@/components/common/ConfirmProvider';
import AuthBootstrap from '@/components/AuthBootstrap';
import RouteProgress from '@/components/RouteProgress';

/**
 * MediaMinds 为「仅深色」设计系统（Midnight），不提供浅色模式切换。
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const theme = useMemo(() => buildTheme(), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouteProgress />
      <AuthBootstrap />
      <ConfirmProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
