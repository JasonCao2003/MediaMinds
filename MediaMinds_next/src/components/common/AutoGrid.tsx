'use client';

import Box from '@mui/material/Box';

interface AutoGridProps {
  minWidth?: number;
  gap?: number;
  columns?: { xs?: string; sm?: string; md?: string; lg?: string };
  children: React.ReactNode;
  sx?: object;
}

/** 响应式 CSS Grid 容器，替代 MUI v6 Grid 的 auto-fit 布局 */
export default function AutoGrid({ minWidth = 260, gap = 3, columns, children, sx }: AutoGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns:
          columns ?? { xs: '1fr', sm: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` },
        gap,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
