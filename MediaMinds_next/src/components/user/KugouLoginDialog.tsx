'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { toast } from '@/lib/notify';
import {
  getKugouLoginStatusService,
  getKugouQrKeyService,
  getKugouQrStatusService,
  kugouLoginByMobileService,
  kugouLogoutService,
  sendKugouSmsCodeService,
} from '@/api/kugou';

type LoginMode = 'qr' | 'sms';

/** 从酷狗返回结构里挑出一个二维码 key（字段名各接口版本不一） */
function pickKey(data: Record<string, unknown> | undefined): string {
  if (!data) return '';
  for (const field of ['qrcode', 'key', 'qrcode_id', 'qrcode_key']) {
    const value = data[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/** 二维码图片地址（base64 或 http URL） */
function pickQrImage(data: Record<string, unknown> | undefined): string {
  if (!data) return '';
  for (const field of ['qrcode_img', 'qrcode_url', 'qrcode', 'img', 'url']) {
    const value = data[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    const text = value.trim();
    if (text.startsWith('http') || text.startsWith('data:')) return text;
    if (/^[A-Za-z0-9+/=]{60,}$/.test(text)) return `data:image/png;base64,${text}`;
  }
  return '';
}

/** 酷狗登录弹窗：扫码 / 手机验证码。后端会把登录态写入进程内配置。 */
export default function KugouLoginDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<LoginMode>('qr');
  const [qrKey, setQrKey] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  /** 当前登录状态（登录态持久化在数据库，打开弹窗时查询） */
  const [status, setStatus] = useState<{ loggedIn: boolean; userId: string }>({ loggedIn: false, userId: '0' });
  const [loggingOut, setLoggingOut] = useState(false);
  const pollRef = useRef<number | null>(null);
  /** 标记本次弹窗是否已完成登录，避免重复提示 */
  const doneRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const loadQr = useCallback(async () => {
    setQrLoading(true);
    stopPolling();
    try {
      const res = await getKugouQrKeyService();
      const data = res.data as unknown as { data?: Record<string, unknown> } & Record<string, unknown>;
      const payload = (data?.data ?? data) as Record<string, unknown>;
      const key = pickKey(payload);
      setQrKey(key);
      setQrImage(pickQrImage(payload));

      if (key) {
        pollRef.current = window.setInterval(async () => {
          if (doneRef.current) return;
          try {
            const status = await getKugouQrStatusService(key);
            const statusData = status.data as unknown as Record<string, unknown>;
            const inner = (statusData?.data ?? statusData) as Record<string, unknown>;
            const token = inner?.token ?? inner?.user_token;
            if (typeof token === 'string' && token.trim()) {
              doneRef.current = true;
              stopPolling();
              setStatus({ loggedIn: true, userId: String(inner?.userid ?? inner?.user_id ?? '') });
              toast.success('酷狗登录成功（登录态已保存，重启后仍有效）');
              onClose();
            }
          } catch {
            /* 未扫码 / 轮询失败都继续 */
          }
        }, 2500);
      }
    } catch {
      toast.error('获取酷狗二维码失败');
    } finally {
      setQrLoading(false);
    }
  }, [onClose, stopPolling]);

  useEffect(() => {
    if (!open) {
      doneRef.current = false;
      stopPolling();
      return;
    }
    setMode('qr');
    setQrKey('');
    setQrImage('');
    setCode('');
    void getKugouLoginStatusService()
      .then((res) => setStatus(res.data ?? { loggedIn: false, userId: '0' }))
      .catch(() => {
        /* 忽略 */
      });
    void loadQr();
    return () => stopPolling();
  }, [open, loadQr, stopPolling]);

  const logout = async () => {
    setLoggingOut(true);
    try {
      const res = await kugouLogoutService();
      if (res.code === 200) {
        setStatus({ loggedIn: false, userId: '0' });
        toast.success('已退出酷狗登录');
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoggingOut(false);
    }
  };

  const changeMode = (next: LoginMode) => {
    setMode(next);
    if (next === 'qr') void loadQr();
    else stopPolling();
  };

  const sendCode = async () => {
    if (!mobile.trim()) {
      toast.warning('请输入手机号');
      return;
    }
    setSending(true);
    try {
      const res = await sendKugouSmsCodeService(mobile.trim());
      if (res.code === 200) toast.success('验证码已发送');
      else toast.error((res as { message?: string }).message || '发送失败');
    } catch {
      /* 拦截器已提示 */
    } finally {
      setSending(false);
    }
  };

  const login = async () => {
    if (!mobile.trim() || !code.trim()) {
      toast.warning('请输入手机号和验证码');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await kugouLoginByMobileService(mobile.trim(), code.trim());
      if (res.code === 200) {
        setStatus({ loggedIn: true, userId: status.userId });
        toast.success('酷狗登录成功（登录态已保存，重启后仍有效）');
        onClose();
      } else {
        toast.error((res as { message?: string }).message || '登录失败');
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pt: 2.5 }}>酷狗登录</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {status.loggedIn ? `当前已登录（userid：${status.userId || '—'}），登录态已持久化` : '当前未登录'}
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={mode}
          onChange={(_, value) => value && changeMode(value as LoginMode)}
          sx={{ mb: 2.5 }}
        >
          <ToggleButton value="qr">扫码登录</ToggleButton>
          <ToggleButton value="sms">验证码登录</ToggleButton>
        </ToggleButtonGroup>

        {mode === 'qr' ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 1.5 }}>
            {qrLoading ? (
              <Typography color="text.secondary">正在获取二维码…</Typography>
            ) : qrImage ? (
              <Box
                component="img"
                src={qrImage}
                alt="酷狗登录二维码"
                sx={{ width: 200, height: 200, bgcolor: 'var(--mm-bg)', boxShadow: 'var(--mm-sunken-sm)', display: 'block' }}
              />
            ) : qrKey ? (
              <Typography variant="body2" sx={{ wordBreak: 'break-all', textAlign: 'center' }}>
                二维码 key：{qrKey}
              </Typography>
            ) : (
              <Typography color="text.secondary">暂时拿不到二维码</Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              用酷狗 App 扫码并确认，登录成功后会自动关闭；登录态仅保存在当前运行的服务进程内。
            </Typography>
            <Button variant="outlined" size="small" onClick={loadQr} disabled={qrLoading}>
              刷新二维码
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ py: 1 }}>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="手机号"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
              <Button variant="outlined" onClick={sendCode} disabled={sending} sx={{ flexShrink: 0 }}>
                {sending ? '发送中…' : '发送验证码'}
              </Button>
            </Stack>
            <TextField
              fullWidth
              size="small"
              label="验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Typography variant="caption" color="text.secondary">
              登录态仅保存在当前运行的服务进程内，重启后回到环境变量配置。
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
        {status.loggedIn && (
          <Button variant="outlined" color="error" onClick={logout} disabled={loggingOut}>
            {loggingOut ? '退出中…' : '退出登录'}
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={login} disabled={mode !== 'sms' || loggingIn}>
          {loggingIn ? '登录中…' : '登录'}
        </Button>
        <Button variant="outlined" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
