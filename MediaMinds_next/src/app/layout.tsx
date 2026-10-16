import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Providers from './providers';
import { THEME_COOKIE, type ThemeMode } from '@/lib/themeCookie';
import './globals.css';

/**
 * 字体：Space Grotesk（Brutalism 官方搭配 · Kinetic Brutalism）
 *
 * 几何无衬线，字形偏窄、结构外露，与硬边描边和大字重非常衬。
 * 不含中文字形，中文由 theme 的字体栈回落到系统黑体（PingFang SC / 微软雅黑 / Noto Sans SC）。
 */
const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap';

export const metadata: Metadata = {
  title: 'MediaMinds · 智能书影音管理系统',
  description:
    '基于 Spring Cloud + Next.js + LangChain4j 的智能书影音管理系统，统一管理书籍、音乐与视频。',
  applicationName: 'MediaMinds',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 服务端读取主题 cookie，直接写进 <html data-theme>，首帧即正确主题
  const cookieStore = await cookies();
  const mode: ThemeMode = cookieStore.get(THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light';

  return (
    <html lang="zh-CN" data-theme={mode} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_CSS} />
      </head>
      <body>
        <AppRouterCacheProvider options={{ key: 'mui', enableCssLayer: false }}>
          <Providers initialMode={mode}>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
