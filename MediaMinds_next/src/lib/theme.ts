'use client';

import { alpha, createTheme, type Theme } from '@mui/material/styles';

/**
 * MediaMinds「Brutal」设计系统 —— Brutalism（粗野主义）
 *
 * 反设计取向：**裸露结构、拒绝修饰**。
 *
 *   - 圆角 0px，阴影全部取消，层次由 **3px 实心描边** 表达
 *   - **无过渡动画**（瞬时切换），按下时元素整体位移而非渐变
 *   - 纯原色：蓝 #0000FF / 红 #FF0000 / 黄 #FFFF00 + 黑白
 *   - 字体 Space Grotesk，字重 700-900，大写字距收紧
 *   - 背景铺可见网格线（`--mm-grid`），结构不隐藏
 *
 * 提供 light / dark 两套令牌，右上角切换。
 * 注意：dark 模式下「纯原色」不可读（蓝 #0000FF 在黑底上对比度仅 2.4:1），
 * 因此文字用的强调色单独给了一组提亮变体，填充色仍用纯原色。
 */

export type ThemeMode = 'light' | 'dark';

export interface BrutTokens {
  mode: ThemeMode;
  /** 页面底色 */
  bg: string;
  /** 灰底块：引用、代码、凹陷区、图片占位 */
  sunken: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  /** 描边色（所有元素的 3px 边框） */
  border: string;
  /** 背景网格线 */
  grid: string;
  /** 主操作色（纯蓝） */
  accent: string;
  accentHover: string;
  accentContrast: string;
  /** 强调色作为文字时使用（保证 4.5:1） */
  accentText: string;
  accentSoft: string;
  /** 纯原色，用于填充色块 */
  red: string;
  redContrast: string;
  yellow: string;
  yellowContrast: string;
  blue: string;
  blueContrast: string;
  /** 语义色（均为文字安全值） */
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** 兼容旧令牌名（新拟态遗留），Brutalism 下不再作为阴影使用 */
  shadowLight: string;
  shadowDark: string;
}

/** 浅色：白底黑框 + 纯原色 */
export const lightTokens: BrutTokens = {
  mode: 'light',
  bg: '#FFFFFF',
  sunken: '#F1F1F1',
  text: '#000000',
  textSecondary: '#3A3A3A',
  textMuted: '#6E6E6E',
  border: '#000000',
  grid: 'rgba(0, 0, 0, 0.07)',
  accent: '#0000FF',
  accentHover: '#0000CC',
  accentContrast: '#FFFFFF',
  accentText: '#0000FF',
  accentSoft: '#D8D8FF',
  red: '#FF0000',
  redContrast: '#000000',
  yellow: '#FFFF00',
  yellowContrast: '#000000',
  blue: '#0000FF',
  blueContrast: '#FFFFFF',
  success: '#007A3D',
  warning: '#8A5A00',
  danger: '#CC0000',
  info: '#0000FF',
  shadowLight: '#FFFFFF',
  shadowDark: '#000000',
};

/** 深色：黑底白框；填充仍是纯原色，文字色提亮以保证对比度 */
export const darkTokens: BrutTokens = {
  mode: 'dark',
  bg: '#000000',
  sunken: '#141414',
  text: '#FFFFFF',
  textSecondary: '#C9C9C9',
  textMuted: '#8A8A8A',
  border: '#FFFFFF',
  grid: 'rgba(255, 255, 255, 0.09)',
  accent: '#2B2BFF',
  accentHover: '#4A4AFF',
  accentContrast: '#FFFFFF',
  accentText: '#8C8CFF',
  accentSoft: '#1A1A4D',
  red: '#FF0000',
  redContrast: '#000000',
  yellow: '#FFFF00',
  yellowContrast: '#000000',
  blue: '#0000FF',
  blueContrast: '#FFFFFF',
  success: '#3DDC84',
  warning: '#FFD400',
  danger: '#FF6B6B',
  info: '#8C8CFF',
  shadowLight: '#FFFFFF',
  shadowDark: '#000000',
};

export const brutTokensFor = (mode: ThemeMode): BrutTokens => (mode === 'dark' ? darkTokens : lightTokens);

/** 描边宽度档位 */
const STROKE = { sm: 2, md: 3, lg: 4, xl: 5 } as const;
export type NeuSize = keyof typeof STROKE;

const strokeOf = (size: NeuSize) => STROKE[size];

/**
 * 「凸起」→ Brutalism 下语义为 **外描边**。
 * 用 box-shadow 画环而不是 border，好处是不改变盒模型、不会造成布局位移，
 * 且与页面里已有的 `boxShadow: 'var(--mm-raised-*)'` 写法天然兼容。
 */
export function neuRaised(t: BrutTokens, size: NeuSize = 'md') {
  return `0 0 0 ${strokeOf(size)}px ${t.border}`;
}

/** 「凹陷」→ 内描边 */
export function neuSunken(t: BrutTokens, size: NeuSize = 'md') {
  return `inset 0 0 0 ${strokeOf(size)}px ${t.border}`;
}

/** 浮层：外描边 + 极硬的偏移投影（唯一允许的「阴影」，用来把浮层从平面上撬起来） */
export function neuFloat(t: BrutTokens, size: NeuSize = 'lg') {
  return `0 0 0 ${strokeOf(size)}px ${t.border}`;
}

/** 中文优先字体栈：Space Grotesk 负责拉丁与数字，中文回落系统黑体 */
export const FONT_STACK = [
  '"Space Grotesk"',
  '"PingFang SC"',
  '"Hiragino Sans GB"',
  '"Microsoft YaHei"',
  '"Noto Sans SC"',
  'system-ui',
  '-apple-system',
  '"Segoe UI"',
  'sans-serif',
].join(',');

declare module '@mui/material/styles' {
  interface Theme {
    mm: BrutTokens;
    neu: {
      raised: (size?: NeuSize) => string;
      sunken: (size?: NeuSize) => string;
      float: (size?: NeuSize) => string;
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThemeOptions {
    mm?: BrutTokens;
    neu?: {
      raised: (size?: NeuSize) => string;
      sunken: (size?: NeuSize) => string;
      float: (size?: NeuSize) => string;
    };
  }
}

export function buildTheme(mode: ThemeMode = 'light'): Theme {
  const t = brutTokensFor(mode);
  const isLight = mode === 'light';

  const neu = {
    raised: (size: NeuSize = 'md') => neuRaised(t, size),
    sunken: (size: NeuSize = 'md') => neuSunken(t, size),
    float: (size: NeuSize = 'lg') => neuFloat(t, size),
  };

  const ring = neuRaised(t, 'md');
  const ringSm = neuRaised(t, 'sm');
  const ringIn = neuSunken(t, 'md');

  /**
   * 所有单行控件的统一高度。
   *
   * 输入框 / 下拉 / 分段按钮 / 按钮如果各按各的 padding 撑高度，
   * 放在同一行里就会出现「高矮不齐」。这里统一成 46px，
   * 并配合 `whiteSpace: nowrap` 防止文字被挤压后竖排换行（那会把控件撑得极高）。
   */
  const CONTROL_H = 46;

  // Brutalism 没有高度层级，全部压平
  const shadows = Array.from({ length: 25 }, () => 'none') as Theme['shadows'];

  return createTheme({
    mm: t,
    neu,
    palette: {
      mode,
      primary: { main: t.accent, light: t.accentHover, dark: t.accentHover, contrastText: t.accentContrast },
      secondary: { main: t.red, contrastText: t.redContrast },
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.danger },
      info: { main: t.info },
      background: { default: t.bg, paper: t.bg },
      text: { primary: t.text, secondary: t.textSecondary, disabled: t.textMuted },
      divider: t.border,
      action: {
        hover: t.sunken,
        selected: t.accentSoft,
        focus: alpha(t.accent, 0.4),
        disabled: t.textMuted,
        disabledBackground: t.sunken,
      },
    },
    shape: { borderRadius: 0 },
    shadows,
    typography: {
      fontFamily: FONT_STACK,
      h1: { fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.05, textTransform: 'uppercase' },
      h2: { fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, textTransform: 'uppercase' },
      h3: { fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.15 },
      h4: { fontWeight: 800, letterSpacing: '-0.03em' },
      h5: { fontWeight: 800, letterSpacing: '-0.025em' },
      h6: { fontWeight: 800, letterSpacing: '-0.02em' },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      body1: { lineHeight: 1.65, fontWeight: 500 },
      body2: { lineHeight: 1.6, fontWeight: 500 },
      button: { fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' },
      caption: { letterSpacing: '0.02em', fontWeight: 600 },
      overline: { fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.bg,
            color: t.text,
            // 可见网格：结构不隐藏，这是 Brutalism 的标志之一
            backgroundImage: `linear-gradient(to right, ${t.grid} 1px, transparent 1px),
                              linear-gradient(to bottom, ${t.grid} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            backgroundAttachment: 'fixed',
            scrollbarColor: `${t.border} ${t.bg}`,
            '&::-webkit-scrollbar': { width: 14, height: 14 },
            '&::-webkit-scrollbar-track': { background: t.bg, borderLeft: `1px solid ${t.grid}` },
            '&::-webkit-scrollbar-thumb': { backgroundColor: t.text, borderRadius: 0 },
          },
          '*:focus-visible': {
            outline: `3px solid ${t.accent}`,
            outlineOffset: 2,
          },
          // Brutalism：拒绝过渡动画，一切瞬时生效
          '*, *::before, *::after': {
            transitionProperty: 'none !important',
            transitionDuration: '0s !important',
          },
        },
      },

      // ── 表面：白底 + 黑框，没有圆角、没有阴影 ────────────────
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none', backgroundColor: t.bg, color: t.text, boxShadow: ring },
          rounded: { borderRadius: 0 },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: t.bg,
            backgroundImage: 'none',
            borderRadius: 0,
            border: 'none',
            boxShadow: ring,
          },
        },
      },

      // ── 交互：无过渡，按下整体位移 ──────────────────────────
      MuiButton: {
        defaultProps: { disableElevation: true, disableRipple: true },
        styleOverrides: {
          root: {
            borderRadius: 0,
            paddingInline: 22,
            minHeight: CONTROL_H,
            border: 'none',
            boxShadow: ring,
            whiteSpace: 'nowrap',
            '&:active': { transform: 'translate(3px, 3px)', boxShadow: 'none' },
            '&.Mui-disabled': { boxShadow: ringSm, color: t.textMuted, opacity: 0.55 },
          },
          containedPrimary: {
            backgroundColor: t.accent,
            color: t.accentContrast,
            '&:hover': { backgroundColor: t.accentHover },
          },
          containedSecondary: {
            backgroundColor: t.red,
            color: t.redContrast,
            '&:hover': { backgroundColor: t.red, color: t.redContrast },
          },
          outlined: {
            backgroundColor: t.bg,
            color: t.text,
            border: 'none',
            boxShadow: ring,
            '&:hover': { backgroundColor: t.sunken, color: t.text },
          },
          text: {
            boxShadow: 'none',
            backgroundColor: 'transparent',
            color: t.accentText,
            '&:hover': { backgroundColor: t.accentSoft },
            '&:active': { transform: 'translate(3px, 3px)', boxShadow: 'none' },
          },
          sizeSmall: { minHeight: 38, paddingBlock: 0, paddingInline: 14, borderRadius: 0 },
          sizeLarge: { minHeight: 54, paddingBlock: 0, paddingInline: 28, borderRadius: 0, fontSize: '1rem' },
        },
      },
      MuiIconButton: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: {
            borderRadius: 0,
            color: t.text,
            boxShadow: ringSm,
            backgroundColor: t.bg,
            '&:hover': { backgroundColor: t.sunken, color: t.text },
            '&:active': { transform: 'translate(2px, 2px)', boxShadow: 'none' },
            '&.Mui-disabled': { boxShadow: 'none', color: t.textMuted },
          },
          sizeSmall: { borderRadius: 0 },
        },
      },
      MuiToggleButton: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: {
            border: 'none',
            borderRadius: 0,
            textTransform: 'uppercase',
            fontWeight: 800,
            letterSpacing: '0.03em',
            color: t.textSecondary,
            backgroundColor: t.bg,
            minHeight: CONTROL_H,
            paddingBlock: 0,
            paddingInline: 18,
            // 关键：不换行、不被压缩。否则文字会被挤成竖排，把控件撑到极高
            whiteSpace: 'nowrap',
            flexShrink: 0,
            '&:hover': { backgroundColor: t.sunken, color: t.text },
            '&.Mui-selected': {
              color: t.bg,
              backgroundColor: t.text,
              '&:hover': { backgroundColor: t.text, color: t.bg },
            },
          },
          sizeSmall: {
            minHeight: CONTROL_H,
            paddingBlock: 0,
            paddingInline: 14,
            fontSize: '0.82rem',
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg,
            boxShadow: ring,
            borderRadius: 0,
            gap: 0,
            '& .MuiToggleButtonGroup-grouped': {
              border: 'none !important',
              margin: 0,
              borderRadius: '0 !important',
              borderLeft: `1px solid ${t.border} !important`,
              '&:first-of-type': { borderLeft: 'none !important' },
            },
          },
        },
      },

      // ── 表单：白底黑框 ─────────────────────────────────────
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: t.bg,
            boxShadow: ringSm,
            minHeight: CONTROL_H,
            // 保证输入区与前后缀图标垂直居中（InputBase 默认不设 align-items）
            alignItems: 'center',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${t.accent}` },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '&.Mui-error': { boxShadow: `0 0 0 3px ${t.danger}` },

            // 单行输入框与下拉统一 46px。
            // 用元素/role 选择器（而非 MUI 的 slot 类）提高优先级，
            // 才能压过 MUI 按尺寸生成的 inputSizeSmall 等 padding，避免同一行里高矮不齐。
            '& input, & [role="combobox"]': {
              padding: '0 16px',
              height: CONTROL_H,
              lineHeight: `${CONTROL_H}px`,
              boxSizing: 'border-box',
              fontWeight: 600,
            },
            '& input::placeholder': { color: t.textMuted, opacity: 1 },
            // 多行文本框不受 46px 约束
            '& textarea': {
              padding: '12px 16px',
              height: 'auto',
              lineHeight: 1.6,
              boxSizing: 'border-box',
              fontWeight: 600,
            },
          },
          multiline: { padding: 0 },
        },
      },
      // 标签放到输入框**上方**，而不是压在描边上。
      // 原因：Brutalism 去掉了 notched outline（那圈缺口是给浮动标签让位的），
      // 若继续用 MUI 默认的绝对定位浮动标签，标签会正好落在 3px 描边上造成文字与边框重合。
      MuiInputLabel: {
        styleOverrides: {
          root: {
            position: 'static',
            transform: 'none',
            marginBottom: 6,
            maxWidth: '100%',
            color: t.textSecondary,
            fontWeight: 800,
            fontSize: '0.76rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            '&.Mui-focused': { color: t.accentText },
            '&.Mui-error': { color: t.danger },
            '&.Mui-disabled': { color: t.textMuted },
          },
          outlined: {
            position: 'static',
            transform: 'none',
            '&.MuiInputLabel-shrink': { transform: 'none' },
          },
          filled: {
            position: 'static',
            transform: 'none',
            '&.MuiInputLabel-shrink': { transform: 'none' },
          },
          standard: {
            position: 'static',
            transform: 'none',
            '&.MuiInputLabel-shrink': { transform: 'none' },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { marginLeft: 0, fontSize: '0.78rem', fontWeight: 600 } },
      },
      MuiFilledInput: {
        styleOverrides: { root: { backgroundColor: t.sunken, borderRadius: 0, boxShadow: ringSm } },
      },
      MuiSelect: {
        styleOverrides: {
          // 高度与内边距由 MuiOutlinedInput.root 里的 [role="combobox"] 规则统一处理，
          // 这里只去掉聚焦时的灰底（Brutalism 不用填充色表达聚焦）
          select: { '&:focus': { backgroundColor: 'transparent' } },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { padding: 8 },
          track: { backgroundColor: t.sunken, borderRadius: 0, opacity: 1, boxShadow: ringSm },
          thumb: { backgroundColor: t.text, borderRadius: 0, boxShadow: 'none' },
          switchBase: {
            '&.Mui-checked': {
              '& + .MuiSwitch-track': { backgroundColor: t.accent, opacity: 1 },
              '& .MuiSwitch-thumb': { backgroundColor: t.accentContrast },
            },
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: { color: t.accent, height: 8 },
          rail: { backgroundColor: t.sunken, opacity: 1, height: 8, borderRadius: 0, boxShadow: ringSm },
          track: { border: 'none', height: 8, borderRadius: 0, backgroundColor: t.accent },
          thumb: {
            width: 18,
            height: 18,
            borderRadius: 0,
            backgroundColor: t.text,
            boxShadow: 'none',
            '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: `0 0 0 3px ${t.accent}` },
          },
          valueLabel: {
            backgroundColor: t.text,
            color: t.bg,
            borderRadius: 0,
            fontWeight: 800,
            '&::before': { display: 'none' },
          },
        },
      },

      // ── 分段控件：整体一个框，选中项反白 ────────────────────
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: CONTROL_H,
            backgroundColor: t.bg,
            boxShadow: ring,
            borderRadius: 0,
            padding: 0,
            display: 'inline-flex',
            // 不压缩、不换行；超出时由 MUI 的 scrollable 变体内部滚动
            flexShrink: 0,
            maxWidth: '100%',
          },
          indicator: { display: 'none' },
          flexContainer: { gap: 0 },
        },
      },
      MuiTab: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: {
            minHeight: CONTROL_H,
            borderRadius: 0,
            paddingInline: 20,
            textTransform: 'uppercase',
            fontWeight: 800,
            letterSpacing: '0.03em',
            color: t.textSecondary,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            borderLeft: `1px solid ${t.border}`,
            '&:first-of-type': { borderLeft: 'none' },
            '&:hover': { backgroundColor: t.sunken, color: t.text },
            '&.Mui-selected': { color: t.bg, backgroundColor: t.text },
          },
        },
      },

      // ── 其他表面 ───────────────────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            fontWeight: 700,
            backgroundColor: t.bg,
            color: t.textSecondary,
            boxShadow: ringSm,
            whiteSpace: 'nowrap',
            '& .MuiChip-icon, & .MuiChip-deleteIcon': { color: 'inherit' },
          },
          filledPrimary: { backgroundColor: t.accent, color: t.accentContrast },
          outlined: { border: 'none', boxShadow: ringSm, backgroundColor: t.bg },
          sizeSmall: { height: 28, fontSize: '0.72rem' },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: t.sunken,
            color: t.text,
            fontWeight: 800,
            borderRadius: 0,
            boxShadow: ringSm,
          },
          rounded: { borderRadius: 0 },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: t.border, borderBottomWidth: 2 } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            '&:hover': { backgroundColor: t.sunken },
            '&.Mui-selected': {
              backgroundColor: t.text,
              color: t.bg,
              '&:hover': { backgroundColor: t.text },
            },
          },
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { color: 'inherit', minWidth: 38 } } },

      // ── 浮层 ───────────────────────────────────────────────
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: t.bg,
            borderRadius: 0,
            border: 'none',
            boxShadow: `0 0 0 3px ${t.border}, 10px 10px 0 0 ${t.border}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: t.bg,
            borderRadius: 0,
            border: 'none',
            boxShadow: `0 0 0 3px ${t.border}, 6px 6px 0 0 ${t.border}`,
            marginTop: 6,
            minWidth: 200,
          },
          list: { padding: 0 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            fontWeight: 700,
            color: t.text,
            '&:hover': { backgroundColor: t.text, color: t.bg },
            '&.Mui-selected': { backgroundColor: t.accentSoft, color: t.text },
            '&.Mui-selected:hover': { backgroundColor: t.text, color: t.bg },
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: t.bg,
            borderRadius: 0,
            boxShadow: `0 0 0 3px ${t.border}, 8px 8px 0 0 ${t.border}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: t.text,
            color: t.bg,
            borderRadius: 0,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            padding: '7px 11px',
            boxShadow: 'none',
          },
          arrow: { color: t.text },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: t.bg,
            backgroundImage: 'none',
            border: 'none',
            boxShadow: `0 0 0 3px ${t.border}`,
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: { backgroundColor: isLight ? alpha('#000000', 0.55) : alpha('#FFFFFF', 0.28) },
        },
      },

      // ── 数据展示 ───────────────────────────────────────────
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 0, height: 10, backgroundColor: t.sunken, boxShadow: ringSm },
          bar: { borderRadius: 0, backgroundColor: t.accent },
        },
      },
      MuiCircularProgress: { styleOverrides: { circle: { strokeLinecap: 'butt' } } },
      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: {
          root: { backgroundColor: t.sunken, borderRadius: 0 },
          wave: {
            '&::after': {
              background: `linear-gradient(90deg, transparent, ${alpha(t.border, 0.16)}, transparent)`,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `2px solid ${t.border}`, padding: '14px 16px', fontWeight: 600 },
          head: {
            color: t.bg,
            backgroundColor: t.text,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderBottom: `2px solid ${t.border}`,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: { root: { '&:hover': { backgroundColor: t.sunken } } },
      },
      MuiAccordion: {
        defaultProps: { elevation: 0, disableGutters: true },
        styleOverrides: {
          root: {
            backgroundColor: t.bg,
            borderRadius: 0,
            boxShadow: ring,
            marginBottom: 0,
            borderBottom: `1px solid ${t.border}`,
            '&::before': { display: 'none' },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            boxShadow: ring,
            backgroundColor: t.bg,
            border: 'none',
            fontWeight: 600,
          },
          standardInfo: { color: t.info, backgroundColor: t.bg },
          standardError: { color: t.danger, backgroundColor: t.bg },
          standardWarning: { color: t.warning, backgroundColor: t.bg },
          standardSuccess: { color: t.success, backgroundColor: t.bg },
          filledInfo: { backgroundColor: t.info, color: t.bg, boxShadow: ring },
          filledError: { backgroundColor: t.danger, color: t.bg, boxShadow: ring },
          filledWarning: { backgroundColor: t.warning, color: t.bg, boxShadow: ring },
          filledSuccess: { backgroundColor: t.success, color: t.bg, boxShadow: ring },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: { fontWeight: 800, borderRadius: 0, boxShadow: 'none' },
        },
      },
      MuiLink: { styleOverrides: { root: { color: t.accentText, fontWeight: 700, textDecoration: 'underline' } } },
    },
  });
}

/** 兼容旧调用 */
export const neuShadow = neuRaised;
