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
        gap: 1,
        p: 4,
      }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', gap: 1.5 }}>
        {icon && <Box sx={{ fontSize: 56, opacity: 0.35, lineHeight: 1 }}>{icon}</Box>}
        <Typography variant="h6" color="text.primary">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ maxWidth: 360 }}>
            {description}
          </Typography>
        )}
        {action && <Box sx={{ mt: 1 }}>{action}</Box>}
      </Box>
    </Box>
  );
}
