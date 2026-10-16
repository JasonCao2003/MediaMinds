'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  LinearProgress,
  useTheme,
} from '@mui/material';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useConfirm } from '@/components/common/ConfirmProvider';
import AutoGrid from '@/components/common/AutoGrid';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/notify';
import {
  userInfoService,
  userInfoUpdateService,
  userAvatarUpdateService,
  userPwdUpdateService,
  userDeleteService,
} from '@/api/user';

interface ProfileForm {
  userName: string;
  nickName: string;
  email: string;
  avatar: string;
  sex: string;
  birthday: string;
  introduction: string;
}

export default function UserProfilePage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { mm } = useTheme();
  const { info, setInfo, logout } = useAuthStore();

  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState<ProfileForm>({
    userName: '',
    nickName: '',
    email: '',
    avatar: '',
    sex: '',
    birthday: '',
    introduction: '',
  });
  const original = useRef<ProfileForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPwd, setChangingPwd] = useState(false);

  const loadFromStore = () => {
    const f: ProfileForm = {
      userName: info?.userName || '',
      nickName: info?.nickName || '',
      email: info?.email || '',
      avatar: info?.avatar || '',
      sex: info?.sex || '',
      birthday: info?.birthday ? String(info.birthday).slice(0, 10) : '',
      introduction: info?.introduction || '',
    };
    setForm(f);
    original.current = { ...f };
  };

  useEffect(() => {
    loadFromStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  const refresh = async () => {
    const res = await userInfoService();
    if (res.code === 200 && res.data) setInfo(res.data);
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('头像只能是 JPG 或 PNG 格式');
      return;
    }
    if (file.size / 1024 / 1024 >= 2) {
      toast.error('头像大小不能超过 2MB');
      return;
    }
    setUploading(true);
    try {
      const res = await userAvatarUpdateService(file);
      if (res.code === 200) {
        setForm((f) => ({ ...f, avatar: res.data || f.avatar }));
        await refresh();
        toast.success('头像更新成功');
      }
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await userInfoUpdateService({
        userName: form.userName,
        nickName: form.nickName,
        email: form.email,
        avatar: form.avatar,
        sex: form.sex,
        birthday: form.birthday,
        introduction: form.introduction,
      });
      if (res.code === 200) {
        toast.success('个人信息已更新');
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pwd.oldPassword || !pwd.newPassword) {
      toast.warning('请填写完整密码信息');
      return;
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setChangingPwd(true);
    try {
      const res = await userPwdUpdateService({ oldPassword: pwd.oldPassword, newPassword: pwd.newPassword });
      if (res.code === 200) {
        toast.success('密码修改成功，请重新登录');
        setPwd({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } finally {
      setChangingPwd(false);
    }
  };

  const deleteAccount = async () => {
    const ok = await confirm({
      title: '注销账号',
      description: '注销后账号将无法恢复，确定继续吗？',
      danger: true,
      confirmText: '确认注销',
    });
    if (!ok) return;
    const res = await userDeleteService();
    if (res.code === 200) {
      toast.success('账号已注销');
      logout();
      router.replace('/login');
    }
  };

  return (
    <Box>
      <AutoGrid minWidth={300} gap={3} columns={{ xs: '1fr', md: '320px 1fr' }}>
        {/* 左侧名片 */}
        <Card sx={{ borderRadius: 'var(--mm-radius-xl)', height: 'fit-content' }}>
          <CardContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                variant="rounded"
                src={form.avatar || undefined}
                sx={{ width: 120, height: 120, mx: 'auto', fontSize: 44, borderRadius: 'var(--mm-radius-lg)' }}
              >
                {(form.nickName || form.userName || '用')[0]}
              </Avatar>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={onAvatarChange} />
              <Button
                variant="contained"
                aria-label="上传头像"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  minWidth: 44,
                  width: 44,
                  height: 44,
                  p: 0,
                  borderRadius: 0,
                }}
              >
                <PhotoCameraRoundedIcon fontSize="small" />
              </Button>
            </Box>
            {uploading && <LinearProgress sx={{ mt: 2 }} />}
            <Typography variant="h6" sx={{ mt: 2 }} fontWeight={700}>
              {form.nickName || form.userName || '用户'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {form.email || '未绑定邮箱'}
            </Typography>
          </CardContent>
        </Card>

        {/* 右侧表单：分组卡片 */}
        <Box sx={{ minWidth: 0 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab value="profile" label="基本资料" />
            <Tab value="security" label="安全设置" />
          </Tabs>

          {tab === 'profile' ? (
            <Card sx={{ mt: 2.5, p: { xs: 2.5, md: 3 }, borderRadius: 'var(--mm-radius-xl)' }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    基本资料
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    这些信息会展示在你的个人空间与分享内容中。
                  </Typography>
                </Box>
                <AutoGrid minWidth={240} columns={{ xs: '1fr', sm: '1fr 1fr' }}>
                  <TextField label="用户名" value={form.userName} onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))} />
                  <TextField label="昵称" value={form.nickName} onChange={(e) => setForm((f) => ({ ...f, nickName: e.target.value }))} />
                  <TextField label="邮箱" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  <FormControl>
                    <InputLabel>性别</InputLabel>
                    <Select label="性别" value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}>
                      <MenuItem value="">未设置</MenuItem>
                      <MenuItem value="男">男</MenuItem>
                      <MenuItem value="女">女</MenuItem>
                      <MenuItem value="保密">保密</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="生日"
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </AutoGrid>
                <TextField
                  label="自我介绍"
                  multiline
                  minRows={4}
                  value={form.introduction}
                  onChange={(e) => setForm((f) => ({ ...f, introduction: e.target.value }))}
                />
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<SaveRoundedIcon />}
                    onClick={saveProfile}
                    disabled={saving}
                  >
                    保存修改
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<RestartAltRoundedIcon />}
                    onClick={() => original.current && setForm({ ...original.current })}
                  >
                    重置
                  </Button>
                </Stack>
              </Stack>
            </Card>
          ) : (
            <Stack spacing={3} sx={{ mt: 2.5 }}>
              <Card sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 'var(--mm-radius-xl)' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  修改密码
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  密码长度为 5~16 位，修改后需要重新登录。
                </Typography>
                <Stack spacing={2} sx={{ maxWidth: 420 }}>
                  <TextField
                    type="password"
                    label="旧密码"
                    value={pwd.oldPassword}
                    onChange={(e) => setPwd((p) => ({ ...p, oldPassword: e.target.value }))}
                  />
                  <TextField
                    type="password"
                    label="新密码"
                    value={pwd.newPassword}
                    onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
                  />
                  <TextField
                    type="password"
                    label="确认新密码"
                    value={pwd.confirmPassword}
                    onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
                  />
                  <Button
                    variant="contained"
                    startIcon={<LockRoundedIcon />}
                    onClick={changePassword}
                    disabled={changingPwd}
                  >
                    确认修改
                  </Button>
                </Stack>
              </Card>

              {/* 危险操作：独立灰底区块，与普通表单区分 */}
              <Box
                sx={{
                  p: { xs: 2.5, md: 3 },
                  borderRadius: 'var(--mm-radius-xl)',
                  bgcolor: 'var(--mm-sunken)',
                  boxShadow: 'var(--mm-sunken-sm)',
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                  <WarningAmberRoundedIcon sx={{ color: mm.danger }} />
                  <Typography variant="h6" fontWeight={700} sx={{ color: mm.danger }}>
                    危险操作
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  注销账号将永久删除你的所有数据，且无法恢复。
                </Typography>
                <Button variant="outlined" color="error" startIcon={<DeleteForeverRoundedIcon />} onClick={deleteAccount}>
                  注销账号
                </Button>
              </Box>
            </Stack>
          )}
        </Box>
      </AutoGrid>
    </Box>
  );
}
