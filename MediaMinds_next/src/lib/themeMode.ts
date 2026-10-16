'use client';

import { createContext, useContext } from 'react';
import type { ThemeMode } from './themeCookie';

export interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

/** 默认值仅用于组件脱离 Provider 的极端场景（不会发生） */
export const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  setMode: () => {},
  toggle: () => {},
});

/** 读取 / 切换当前主题模式 */
export const useThemeMode = () => useContext(ThemeModeContext);
