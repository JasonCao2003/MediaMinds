import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Providers from './providers';
import './globals.css';

/**
 * 字体：JetBrains Maple Mono（JetBrains Mono + Maple Mono 合成，含中日字形）
 * 通过官方 ZSFT CDN 加载，按 unicode-range 分片按需下载，无需自托管大字体文件。
 * 仅加载 Regular(400) 与 Bold(700) 两档，其余字重由浏览器就近匹配。
 */
const FONT_CDN = 'https://fontsapi.zeoseven.com/521';

export const metadata: Metadata = {
  title: 'MediaMinds · 智能书影音管理系统',
  description:
    '基于 Spring Cloud + Next.js + Python AI 的智能书影音管理系统，统一管理书籍、音乐与视频。',
  applicationName: 'MediaMinds',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E1018',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fontsapi.zeoseven.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fontsapi.zeoseven.com" />
        <link rel="stylesheet" href={`${FONT_CDN}/main/result.css`} />
        <link rel="stylesheet" href={`${FONT_CDN}/bold/result.css`} />
      </head>
      <body>
        <AppRouterCacheProvider options={{ key: 'mui', enableCssLayer: false }}>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
