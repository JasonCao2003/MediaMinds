'use client';

import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

const FALLBACK = '/cover.jpg';

/**
 * 封面图。
 *
 * 比 `src={cover || '/cover.jpg'}` 更严：空串、纯空格、以及**加载失败的失效链接**
 * 都会回退到默认封面。有些数据源（豆瓣 / Gutenberg）返回的封面字段是空串或死链，
 * 只靠 `||` 是兜不住的。
 */
export default function CoverImage({
  src,
  alt,
  sx,
}: {
  src?: string | null;
  alt: string;
  sx?: SxProps<Theme>;
}) {
  const initial = src && src.trim() ? src.trim() : FALLBACK;

  return (
    <Box
      component="img"
      src={initial}
      alt={alt}
      loading="lazy"
      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
        const el = e.currentTarget;
        // dataset 打标避免死链反复触发 onError 造成死循环
        if (el.dataset.fallback) return;
        el.dataset.fallback = '1';
        el.src = FALLBACK;
      }}
      sx={sx}
    />
  );
}
