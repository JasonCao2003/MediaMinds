'use client';

/**
 * 轻量全局通知总线。
 *
 * axios 拦截器 / WebSocket 服务运行在 React 组件树之外，
 * 无法直接调用 MUI 的 Snackbar，因此通过该事件总线广播通知，
 * 由 <NotificationProvider> 统一渲染。
 */
export type NotifySeverity = 'success' | 'info' | 'warning' | 'error';

export interface NotifyPayload {
  message: string;
  severity?: NotifySeverity;
  title?: string;
  /** 通知中心用，默认 true */
  duration?: number;
}

type Listener = (payload: NotifyPayload) => void;

const listeners = new Set<Listener>();

export const notifyBus = {
  emit(payload: NotifyPayload | string) {
    const normalized: NotifyPayload =
      typeof payload === 'string' ? { message: payload } : payload;
    listeners.forEach((l) => l(normalized));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const toast = {
  success: (message: string) => notifyBus.emit({ message, severity: 'success' }),
  info: (message: string) => notifyBus.emit({ message, severity: 'info' }),
  warning: (message: string) => notifyBus.emit({ message, severity: 'warning' }),
  error: (message: string) => notifyBus.emit({ message, severity: 'error' }),
};
