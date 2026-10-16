'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  collapsed?: boolean;
}

/**
 * MediaMinds 品牌标识（Brutalism）
 *
 * 纯色方块 + 3px 描边 + 大写字标，没有渐变、没有圆角、没有光晕。
 */
export default function BrandLogo({ size = 36, showText = true, collapsed = false }: BrandLogoProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Box
        sx={{
          width: size,
          height: size,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          backgroundColor: 'var(--mm-accent)',
          boxShadow: 'var(--mm-raised-sm)',
        }}
      >
        <AutoStoriesRoundedIcon sx={{ fontSize: size * 0.56, color: 'var(--mm-accent-contrast)' }} />
      </Box>
      {showText && !collapsed && (
        <Typography
          variant="h6"
          sx={{
            fontWeight: 900,
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
            color: 'var(--mm-text)',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          Media<span style={{ color: 'var(--mm-accent-text)' }}>Minds</span>
        </Typography>
      )}
    </Box>
  );
}
