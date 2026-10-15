'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  collapsed?: boolean;
  color?: string;
  /** 用于浅色背景时显示深色字 */
  tone?: 'light' | 'dark';
}

/**
 * MediaMinds 品牌标识（Material 风格的方形应用图标 + 文字标）。
 */
export default function BrandLogo({
  size = 36,
  showText = true,
  collapsed = false,
  color,
  tone = 'dark',
}: BrandLogoProps) {
  const textColor = color ?? (tone === 'light' ? '#FFFFFF' : 'text.primary');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(140deg, #7C7FF2 0%, #8B5CF6 100%)',
          boxShadow: '0 10px 24px -10px rgba(124,127,242,.9)',
          flexShrink: 0,
        }}
      >
        <AutoStoriesRoundedIcon sx={{ fontSize: size * 0.58, color: '#fff' }} />
      </Box>
      {showText && !collapsed && (
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            fontFamily: 'inherit',
            letterSpacing: '-0.02em',
            color: textColor,
            whiteSpace: 'nowrap',
          }}
        >
          Media<span style={{ opacity: 0.72 }}>Minds</span>
        </Typography>
      )}
    </Box>
  );
}
