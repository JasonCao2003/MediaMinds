'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
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
  Avatar,
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
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/notify';
import { userRegisterService, userInfoService } from '@/api/user';
import { accountLoginService, emailLoginService, loginValidationService } from '@/api/login';

type LoginType = 'account' | 'email';

const FEATURES = [
  { icon: <AutoStoriesRoundedIcon />, title: '智能图书管理', desc: '自动章节划分 · 在线阅读器 · 内容分析' },
  { icon: <HeadphonesRoundedIcon />, title: '音乐与歌词', desc: '在线播放 · 歌词同步 · 情感分析' },
  { icon: <MovieRoundedIcon />, title: '影视播放中心', desc: 'TMDB 导入 · 进度记忆 · 评论点赞' },
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

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      {/* 左侧品牌区 */}
      <Box
        sx={{
          flex: 1.1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 5, lg: 7 },
          position: 'relative',
          overflow: 'hidden',
          color: '#fff',
          background: 'linear-gradient(150deg, #312E81 0%, #4F46E5 45%, #E11D48 130%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,.18) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.12) 0, transparent 45%)',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <BrandLogo size={44} tone="light" />
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
          <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.15, mb: 2 }}>
            让媒体管理
            <br />
            更简单、更智能
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.85, fontWeight: 400, mb: 5 }}>
            一站式书影音资源平台 · 融合大模型与语音识别
          </Typography>

          <Stack spacing={2.5}>
            {FEATURES.map((f) => (
              <Stack key={f.title} direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: 'rgba(255,255,255,.16)',
                    color: '#fff',
                    width: 46,
                    height: 46,
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  {f.icon}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{f.title}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.78 }}>
                    {f.desc}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} sx={{ position: 'relative', zIndex: 1 }}>
          <Chip label="Spring Cloud" size="small" sx={{ bgcolor: 'rgba(255,255,255,.16)', color: '#fff' }} />
          <Chip label="Next.js · Material" size="small" sx={{ bgcolor: 'rgba(255,255,255,.16)', color: '#fff' }} />
          <Chip label="AI 加持" size="small" sx={{ bgcolor: 'rgba(255,255,255,.16)', color: '#fff' }} />
        </Stack>
      </Box>

      {/* 右侧表单区 */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2.5, sm: 4 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 460,
            p: { xs: 3, sm: 4.5 },
            borderRadius: 5,
            border: '1px solid',
            borderColor: 'divider',
            animation: 'mm-fade-in 400ms cubic-bezier(.2,0,0,1) both',
          }}
        >
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 3 }}>
            <BrandLogo size={40} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center' }}>
            {isRegister ? '创建账户' : '欢迎回来'}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 0.5, mb: 3 }}>
            {isRegister ? '注册 MediaMinds 账户，开启智能管理' : '登录以继续使用 MediaMinds'}
          </Typography>

          {isRegister ? (
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="用户名"
                value={form.userName}
                onChange={update('userName')}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonRoundedIcon fontSize="small" /></InputAdornment> } }}
                helperText="长度为 5~16 位非空字符"
              />
              <TextField
                fullWidth
                type="password"
                label="密码"
                value={form.password}
                onChange={update('password')}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockRoundedIcon fontSize="small" /></InputAdornment> } }}
              />
              <TextField
                fullWidth
                type="password"
                label="确认密码"
                value={form.rePassword}
                onChange={update('rePassword')}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockRoundedIcon fontSize="small" /></InputAdornment> } }}
              />
              <TextField
                fullWidth
                label="邮箱"
                value={form.email}
                onChange={update('email')}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><MailRoundedIcon fontSize="small" /></InputAdornment> } }}
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
                sx={{ mb: 3, bgcolor: 'action.hover', borderRadius: 999, minHeight: 44, p: 0.5 }}
                TabIndicatorProps={{ sx: { display: 'none' } }}
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
                    sx={{
                      minHeight: 38,
                      borderRadius: 999,
                      mx: 0.25,
                      ...(loginType === t.value && {
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                      }),
                    }}
                  />
                ))}
              </Tabs>

              {loginType === 'account' && (
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="用户名"
                    value={form.userName}
                    onChange={update('userName')}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonRoundedIcon fontSize="small" /></InputAdornment> } }}
                  />
                  <TextField
                    fullWidth
                    type="password"
                    label="密码"
                    value={form.password}
                    onChange={update('password')}
                    onKeyDown={(e) => e.key === 'Enter' && handleAccountLogin()}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockRoundedIcon fontSize="small" /></InputAdornment> } }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    onClick={handleAccountLogin}
                    startIcon={loading && <CircularProgress size={18} color="inherit" />}
                  >
                    登录
                  </Button>
                </Stack>
              )}

              {loginType === 'email' && (
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="邮箱"
                    value={form.email}
                    onChange={update('email')}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><MailRoundedIcon fontSize="small" /></InputAdornment> } }}
                  />
                  <TextField
                    fullWidth
                    label="验证码"
                    value={form.verificationCode}
                    onChange={update('verificationCode')}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start"><LockRoundedIcon fontSize="small" /></InputAdornment>,
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
                  >
                    邮箱登录
                  </Button>
                </Stack>
              )}

              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  还没有账户？
                </Typography>
              </Divider>
              <Button fullWidth variant="outlined" onClick={() => setIsRegister(true)}>
                注册新账户
              </Button>
            </>
          )}

          <Alert severity="info" variant="outlined" sx={{ mt: 3, borderRadius: 3 }}>
            用户名与密码长度均为 5~16 位；邮箱登录需先绑定邮箱。
          </Alert>
        </Paper>
      </Box>
    </Box>
  );
}
