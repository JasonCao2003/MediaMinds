'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/common/ThemeToggle';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/notify';
import { userRegisterService, userInfoService } from '@/api/user';
import { accountLoginService, emailLoginService, loginValidationService } from '@/api/login';

type LoginType = 'account' | 'email';

const FEATURES = [
  { icon: <AutoStoriesRoundedIcon />, title: '智能图书管理', desc: '自动章节划分 · 在线阅读器' },
  { icon: <HeadphonesRoundedIcon />, title: '音乐与歌词', desc: '在线播放 · 歌词同步' },
  { icon: <MovieRoundedIcon />, title: '影视播放中心', desc: 'TMDB 导入 · 进度记忆' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setInfo } = useAuthStore();

  const [isRegister, setIsRegister] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>('account');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    userName: '',
    password: '',
    rePassword: '',
    email: '',
    verificationCode: '',
  });

  const [countdown, setCountdown] = useState(0);

  const redirect = useMemo(() => {
    if (typeof window === 'undefined') return '/content';
    return new URLSearchParams(window.location.search).get('redirect') || '';
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const afterLogin = async () => {
    const res = await userInfoService();
    if (res.code === 200 && res.data) {
      setInfo(res.data);
      router.replace(redirect || '/content');
    } else {
      toast.error(res.msg || '获取用户信息失败');
    }
  };

  const handleAccountLogin = async () => {
    if (!form.userName || !form.password) {
      toast.warning('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await accountLoginService({ userName: form.userName, password: form.password });
      if (res.code === 200) {
        setToken(res.data);
        await afterLogin();
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!form.email || !form.verificationCode) {
      toast.warning('请输入邮箱和验证码');
      return;
    }
    setLoading(true);
    try {
      const res = await emailLoginService({ email: form.email, code: form.verificationCode });
      if (res.code === 200) {
        setToken(res.data);
        await afterLogin();
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    if (!form.email) {
      toast.warning('请输入邮箱');
      return;
    }
    try {
      const res = await loginValidationService({ email: form.email });
      toast.success(res.message || res.msg || '验证码已发送，请查收邮箱');
      setCountdown(60);
    } catch {
      /* ignore */
    }
  };

  const handleRegister = async () => {
    if (!form.userName || !form.password || !form.rePassword || !form.email) {
      toast.warning('请完整填写注册信息');
      return;
    }
    if (form.password !== form.rePassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await userRegisterService({
        userName: form.userName,
        password: form.password,
        rePassword: form.rePassword,
        email: form.email,
        verificationCode: form.verificationCode,
      });
      if (res.code === 200) {
        toast.success(res.msg || '注册成功，请登录');
        setIsRegister(false);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const adornment = (icon: React.ReactNode) => ({
    input: { startAdornment: <InputAdornment position="start">{icon}</InputAdornment> },
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
      }}
    >
      {/* 右上角主题开关 */}
      <Box sx={{ position: 'fixed', top: { xs: 16, md: 24 }, right: { xs: 16, md: 24 }, zIndex: 10 }}>
        <ThemeToggle />
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: 1040,
          borderRadius: 'var(--mm-radius-xl)',
          bgcolor: 'var(--mm-bg)',
          boxShadow: 'var(--mm-raised-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          animation: 'mm-fade-in 420ms var(--mm-ease) both',
        }}
      >
        {/* ── 左侧品牌区：灰底色块，用 3px 描边与表单区切开 ────────── */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 400,
            flexShrink: 0,
            m: 2,
            mr: 0,
            p: 4,
            borderRadius: 'var(--mm-radius-lg)',
            bgcolor: 'var(--mm-sunken)',
            boxShadow: 'var(--mm-sunken-sm)',
          }}
        >
          <BrandLogo size={42} />

          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.25, mb: 1.5 }}>
              让媒体管理
              <br />
              更简单、更智能
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              一站式书影音资源平台，由大模型驱动的智能入库。
            </Typography>

            <Stack spacing={2.5}>
              {FEATURES.map((f) => (
                <Stack key={f.title} direction="row" spacing={1.75} alignItems="center">
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--mm-radius-sm)',
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'var(--mm-bg)',
                      boxShadow: 'var(--mm-raised-sm)',
                      color: 'var(--mm-accent-text)',
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{f.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {f.desc}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label="Spring Cloud" size="small" />
            <Chip label="Next.js" size="small" />
            <Chip label="LangChain4j" size="small" />
          </Stack>
        </Box>

        {/* ── 右侧表单区 ──────────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0, p: { xs: 3, sm: 4, md: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 3 }}>
            <BrandLogo size={40} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center' }}>
            {isRegister ? '创建账户' : '欢迎回来'}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 0.75, mb: 3.5 }}>
            {isRegister ? '注册 MediaMinds 账户，开启智能管理' : '登录以继续使用 MediaMinds'}
          </Typography>

          {isRegister ? (
            <Stack spacing={2.25}>
              <TextField
                fullWidth
                label="用户名"
                value={form.userName}
                onChange={update('userName')}
                slotProps={adornment(<PersonRoundedIcon fontSize="small" />)}
                helperText="长度为 5~16 位非空字符"
              />
              <TextField
                fullWidth
                type="password"
                label="密码"
                value={form.password}
                onChange={update('password')}
                slotProps={adornment(<LockRoundedIcon fontSize="small" />)}
              />
              <TextField
                fullWidth
                type="password"
                label="确认密码"
                value={form.rePassword}
                onChange={update('rePassword')}
                slotProps={adornment(<LockRoundedIcon fontSize="small" />)}
              />
              <TextField
                fullWidth
                label="邮箱"
                value={form.email}
                onChange={update('email')}
                slotProps={adornment(<MailRoundedIcon fontSize="small" />)}
              />
              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                onClick={handleRegister}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <BadgeRoundedIcon />}
                sx={{ mt: 1 }}
              >
                注册
              </Button>
              <Button color="inherit" onClick={() => setIsRegister(false)} startIcon={<ArrowBackRoundedIcon />}>
                返回登录
              </Button>
            </Stack>
          ) : (
            <>
              <Tabs
                value={loginType}
                onChange={(_, v) => setLoginType(v)}
                variant="fullWidth"
                sx={{ mb: 3.5, width: '100%' }}
              >
                {[
                  { value: 'account', label: '账号', icon: <PersonRoundedIcon fontSize="small" /> },
                  { value: 'email', label: '邮箱', icon: <MailRoundedIcon fontSize="small" /> },
                ].map((t) => (
                  <Tab
                    key={t.value}
                    value={t.value}
                    icon={t.icon}
                    iconPosition="start"
                    label={t.label}
                    sx={{ flex: 1 }}
                  />
                ))}
              </Tabs>

              {loginType === 'account' && (
                <Stack spacing={2.25}>
                  <TextField
                    fullWidth
                    label="用户名"
                    value={form.userName}
                    onChange={update('userName')}
                    slotProps={adornment(<PersonRoundedIcon fontSize="small" />)}
                  />
                  <TextField
                    fullWidth
                    type="password"
                    label="密码"
                    value={form.password}
                    onChange={update('password')}
                    onKeyDown={(e) => e.key === 'Enter' && handleAccountLogin()}
                    slotProps={adornment(<LockRoundedIcon fontSize="small" />)}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    onClick={handleAccountLogin}
                    startIcon={loading && <CircularProgress size={18} color="inherit" />}
                    sx={{ mt: 1 }}
                  >
                    登录
                  </Button>
                </Stack>
              )}

              {loginType === 'email' && (
                <Stack spacing={2.25}>
                  <TextField
                    fullWidth
                    label="邮箱"
                    value={form.email}
                    onChange={update('email')}
                    slotProps={adornment(<MailRoundedIcon fontSize="small" />)}
                  />
                  <TextField
                    fullWidth
                    label="验证码"
                    value={form.verificationCode}
                    onChange={update('verificationCode')}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockRoundedIcon fontSize="small" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Button size="small" disabled={countdown > 0} onClick={sendCode}>
                              {countdown > 0 ? `${countdown}s` : '获取验证码'}
                            </Button>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    onClick={handleEmailLogin}
                    startIcon={loading && <CircularProgress size={18} color="inherit" />}
                    sx={{ mt: 1 }}
                  >
                    邮箱登录
                  </Button>
                </Stack>
              )}

              <Divider sx={{ my: 3.5 }}>
                <Typography variant="caption" color="text.secondary">
                  还没有账户？
                </Typography>
              </Divider>
              <Button fullWidth variant="outlined" onClick={() => setIsRegister(true)}>
                注册新账户
              </Button>
            </>
          )}

          <Alert severity="info" sx={{ mt: 3.5 }}>
            用户名与密码长度均为 5~16 位；邮箱登录需先绑定邮箱。
          </Alert>
        </Box>
      </Box>
    </Box>
  );
}
