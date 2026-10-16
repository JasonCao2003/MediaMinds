/**
 * 主题模式的「持久化」载体。
 *
 * 之所以用 cookie 而不是 localStorage：根布局是服务端组件，可以在 SSR 阶段直接
 * 读取 cookie 并把 data-theme 写进 <html>，因此首帧就是正确主题——
 * 既不需要阻塞脚本，也不会有水合不一致（hydration mismatch）。
 */

export type ThemeMode = 'light' | 'dark';

export const THEME_COOKIE = 'mm-theme';

export const isThemeMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark';

/** 写入一年期 cookie，使后续 SSR 直接渲染正确主题 */
export function writeThemeCookie(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

/** 同步 <html data-theme>，globals.css 的 CSS 变量依赖它 */
export function applyThemeAttr(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
}
