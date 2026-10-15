'use client';

import { useEffect, useRef, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { notifyBus, type NotifyPayload, type NotifySeverity } from '@/lib/notify';

interface QueueItem extends NotifyPayload {
  key: number;
  severity: NotifySeverity;
}

/**
 * 全局通知宿主：订阅 notifyBus 并以 MUI Snackbar 顺序展示。
 * axios 拦截器与 WebSocket 服务均通过该组件反馈用户。
 */
export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [current, setCurrent] = useState<QueueItem | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const unsubscribe = notifyBus.subscribe((payload) => {
      setQueue((prev) => [
        ...prev,
        { ...payload, key: ++seq.current, severity: payload.severity ?? 'info' },
      ]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [queue]);

  const handleClose = (_?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setCurrent(null);
  };

  return (
    <>
      {children}
      <Snackbar
        key={current?.key}
        open={Boolean(current)}
        autoHideDuration={current?.duration ?? 3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity ?? 'info'}
          variant="filled"
          elevation={6}
          sx={{ width: '100%', borderRadius: 2.5, fontWeight: 500 }}
        >
          {current?.title ? `${current.title}：${current.message}` : current?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
