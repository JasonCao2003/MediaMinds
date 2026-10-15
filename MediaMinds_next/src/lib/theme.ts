'use client';

import { createTheme, alpha, type Theme } from '@mui/material/styles';

/**
 * MediaMinds「Midnight」深色设计系统
 *
 * 视觉语言：近黑深蓝背景 + 大圆角悬浮外壳 + 低饱和卡片 + 浅紫强调色 + 细微颗粒质感。
 * 仅提供深色主题（dark-only），所有令牌集中在下方 tokens。
 */
export const tokens = {
  // 背景层次
  appBg: '#0E1018',
  shell: '#161923',
  shellGradient: 'linear-gradient(180deg, #191D28 0%, #14171F 100%)',
  surface: '#1E2230',
  surfaceAlt: '#232838',
  surfaceHover: '#262B3C',
  // 描边
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  // 文字
  textPrimary: '#EAEBF2',
  textSecondary: '#9AA0B4',
  textMuted: '#6E7488',
  // 强调色（参考图浅紫）
  accent: '#7C7FF2',
  accentHover: '#8E90F5',
  accentSoft: 'rgba(124,127,242,0.16)',
  accentSofter: 'rgba(124,127,242,0.08)',
  // 语义色
  success: '#5FD0B0',
  warning: '#E0B15A',
  danger: '#E0607A',
  violet: '#8B5CF6',
  steel: '#5A78B4',
  olive: '#B4AA5A',
} as const;

/** 胶囊 / 卡片可用的低饱和渐变底色 */
export const tintGradients = {
  accent: `linear-gradient(90deg, ${alpha(tokens.accent, 0.16)} 0%, ${alpha(tokens.accent, 0.05)} 100%)`,
  violet: `linear-gradient(90deg, ${alpha(tokens.violet, 0.18)} 0%, ${alpha(tokens.violet, 0.05)} 100%)`,
  steel: `linear-gradient(90deg, ${alpha(tokens.steel, 0.2)} 0%, ${alpha(tokens.steel, 0.05)} 100%)`,
  olive: `linear-gradient(90deg, ${alpha(tokens.olive, 0.18)} 0%, ${alpha(tokens.olive, 0.05)} 100%)`,
  success: `linear-gradient(90deg, ${alpha(tokens.success, 0.18)} 0%, ${alpha(tokens.success, 0.05)} 100%)`,
} as const;

// MUI 要求 25 级阴影；深色下使用大而柔的低透明度黑 + 顶部高光边
const elevationShadows = Array.from({ length: 25 }, (_, i) => {
  if (i === 0) return 'none';
  const y = Math.round(i * 2);
  const blur = Math.round(i * 4.2);
  const spread = Math.round(i * 0.4);
  const alphaVal = Math.min(0.5, 0.12 + i * 0.02);
  return `0 ${y}px ${blur}px -${spread}px rgba(0,0,0,${alphaVal.toFixed(3)})`;
}) as Theme['shadows'];

export function buildTheme(): Theme {
  return createTheme({
    palette: {
      mode: 'dark',
      primary: { main: tokens.accent, light: tokens.accentHover, contrastText: '#FFFFFF' },
      secondary: { main: tokens.violet, contrastText: '#FFFFFF' },
      success: { main: tokens.success },
      warning: { main: tokens.warning },
      error: { main: tokens.danger },
      info: { main: tokens.steel },
      background: { default: tokens.appBg, paper: tokens.surface },
      text: { primary: tokens.textPrimary, secondary: tokens.textSecondary, disabled: tokens.textMuted },
      divider: tokens.border,
      action: {
        hover: 'rgba(255,255,255,0.04)',
        selected: 'rgba(124,127,242,0.16)',
        focus: 'rgba(124,127,242,0.24)',
      },
    },
    shape: { borderRadius: 14 },
    shadows: elevationShadows,
    typography: {
      fontFamily: [
        '"JetBrains Maple Mono"',
        '"JetBrains Mono"',
        '"Maple Mono"',
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Consolas',
        'monospace',
      ].join(','),
      h1: { fontWeight: 800, letterSpacing: '-0.03em' },
      h2: { fontWeight: 800, letterSpacing: '-0.03em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: tokens.appBg,
            backgroundImage: `radial-gradient(1200px 600px at 15% -10%, ${alpha(tokens.accent, 0.1)} 0%, transparent 55%),
                              radial-gradient(900px 500px at 100% 0%, ${alpha(tokens.violet, 0.08)} 0%, transparent 50%)`,
            backgroundAttachment: 'fixed',
            scrollbarColor: '#2A2F3E transparent',
            '&::-webkit-scrollbar': { width: 10, height: 10 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#2A2F3E',
              borderRadius: 8,
              border: '2px solid transparent',
              backgroundClip: 'content-box',
            },
            '&::-webkit-scrollbar-thumb:hover': { backgroundColor: '#3A4053' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          rounded: { borderRadius: 18 },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: tokens.surface,
            borderRadius: 18,
            border: `1px solid ${tokens.border}`,
            boxShadow: `0 12px 30px -12px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.04)`,
            backgroundImage: 'none',
            transition: 'transform 220ms cubic-bezier(.2,0,0,1), border-color 220ms, box-shadow 220ms',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 999,
            paddingInline: 20,
            minHeight: 40,
            transition: 'background-color 200ms cubic-bezier(.4,0,.2,1), box-shadow 200ms, transform 150ms',
          },
          containedPrimary: {
            '&:hover': { backgroundColor: tokens.accentHover, boxShadow: `0 8px 24px -8px ${alpha(tokens.accent, 0.7)}` },
          },
          outlined: { borderColor: tokens.borderStrong },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 14, transition: 'background-color 180ms, color 180ms' },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.03)',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.borderStrong },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: tokens.accent },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 500,
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: `1px solid ${tokens.border}`,
          },
          filledPrimary: { backgroundColor: tokens.accent, borderColor: 'transparent' },
        },
      },
      // 分段控件风格（对应参考图 Day/Week/Month/Year）
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 44,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 999,
            padding: 4,
            display: 'inline-flex',
          },
          indicator: { display: 'none' },
          flexContainer: { gap: 4 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 36,
            borderRadius: 999,
            paddingInline: 18,
            textTransform: 'none',
            fontWeight: 600,
            color: tokens.textSecondary,
            transition: 'background-color 180ms, color 180ms',
            '&.Mui-selected': { backgroundColor: tokens.accent, color: '#FFFFFF' },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            textTransform: 'none',
            fontWeight: 600,
            borderColor: tokens.border,
            color: tokens.textSecondary,
            paddingInline: 16,
            '&.Mui-selected': { backgroundColor: tokens.accent, color: '#FFFFFF', borderColor: 'transparent' },
            '&.Mui-selected:hover': { backgroundColor: tokens.accentHover },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 999,
            padding: 4,
            gap: 4,
            '& .MuiToggleButtonGroup-grouped': { border: 'none !important', margin: 0 },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${tokens.border}` },
          head: { color: tokens.textSecondary, fontWeight: 700, backgroundColor: 'transparent' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' } },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { backgroundColor: tokens.surface, borderRadius: 22, border: `1px solid ${tokens.border}` },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { backgroundColor: tokens.surfaceAlt, borderRadius: 16, border: `1px solid ${tokens.border}`, marginTop: 6 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { borderRadius: 10, margin: '2px 6px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: '#0B0D14', borderRadius: 10, fontSize: 12, padding: '8px 12px', border: `1px solid ${tokens.border}` },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 999, height: 6, backgroundColor: 'rgba(255,255,255,0.06)' },
          bar: { borderRadius: 999 },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: { color: tokens.accent },
          thumb: { boxShadow: `0 0 0 6px ${alpha(tokens.accent, 0.16)}` },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: tokens.border } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            '&.Mui-selected': { backgroundColor: 'rgba(124,127,242,0.16)' },
            '&.Mui-selected:hover': { backgroundColor: 'rgba(124,127,242,0.22)' },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: { backgroundColor: 'rgba(124,127,242,0.2)' },
        },
      },
    },
  });
}

export const softAlpha = (color: string, value: number) => alpha(color, value);
