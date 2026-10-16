'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import { useThemeMode } from '@/lib/themeMode';

/**
 * 主题切换开关（Brutalism）
 *
 * 一个被 3px 描边切成两格的方块，选中格整体反白——没有任何滑动动画，
 * 状态切换瞬时完成。
 */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useThemeMode();
  const cell = compact ? 32 : 36;

  const cellSx = (active: boolean) => ({
    width: cell,
    height: cell,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    bgcolor: active ? 'var(--mm-text)' : 'var(--mm-bg)',
    color: active ? 'var(--mm-bg)' : 'var(--mm-text-3)',
    '&:hover': {
      bgcolor: active ? 'var(--mm-text)' : 'var(--mm-sunken)',
      color: active ? 'var(--mm-bg)' : 'var(--mm-text)',
    },
  });

  return (
    <Tooltip title={mode === 'dark' ? '切换到浅色主题' : '切换到深色主题'}>
      <Box
        role="group"
        aria-label="主题模式"
        sx={{
          display: 'inline-flex',
          bgcolor: 'var(--mm-bg)',
          boxShadow: 'var(--mm-raised-sm)',
        }}
      >
        <Box
          role="button"
          tabIndex={0}
          aria-pressed={mode === 'light'}
          aria-label="浅色主题"
          onClick={() => setMode('light')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setMode('light');
            }
          }}
          sx={cellSx(mode === 'light')}
        >
          <LightModeRoundedIcon sx={{ fontSize: compact ? 16 : 18 }} />
        </Box>
        <Box
          role="button"
          tabIndex={0}
          aria-pressed={mode === 'dark'}
          aria-label="深色主题"
          onClick={() => setMode('dark')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setMode('dark');
            }
          }}
          sx={{ ...cellSx(mode === 'dark'), borderLeft: '2px solid var(--mm-border-color)' }}
        >
          <DarkModeRoundedIcon sx={{ fontSize: compact ? 16 : 18 }} />
        </Box>
      </Box>
    </Tooltip>
  );
}
