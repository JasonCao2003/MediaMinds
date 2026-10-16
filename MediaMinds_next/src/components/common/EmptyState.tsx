'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  minHeight?: number;
}

/**
 * 空状态
 *
 * 图标放进一个灰底描边方块里，配合弱化文案，空态也不显得「断片」。
 */
export default function EmptyState({
  icon,
  title = '暂无内容',
  description,
  action,
  minHeight = 240,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        minHeight,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        color: 'text.secondary',
        p: 4,
      }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', gap: 2 }}>
        {icon && (
          <Box
            sx={{
              width: 96,
              height: 96,
              borderRadius: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'var(--mm-sunken)',
              boxShadow: 'var(--mm-sunken-sm)',
              color: 'var(--mm-text-3)',
              '& svg': { fontSize: 40 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ maxWidth: 380 }}>
            {description}
          </Typography>
        )}
        {action && <Box sx={{ mt: 1 }}>{action}</Box>}
      </Box>
    </Box>
  );
}
