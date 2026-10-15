'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type Column } from '@/components/common/DataTable';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { toast } from '@/lib/notify';
import {
  adminGetUserListService,
  adminUpdateUserRoleService,
  adminUpdateUserStatusService,
  adminDeleteUserService,
  adminAddUserService,
  type UserItem,
} from '@/api/user';

interface UserRow extends UserItem {
  createdAt?: string;
  updatedAt?: string;
  oauth2Provider?: string;
  oauth2Expiry?: string;
}

const STATUS_LABEL: Record<string, string> = { active: '正常', inactive: '禁用' };

function formatDate(value?: string) {
  if (!value) return '未设置';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserManagementPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState({ userName: '', email: '', role: '', status: '' });

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ userName: '', email: '', password: '123456', role: 'user', status: 'active' });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('basic');
  const [current, setCurrent] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetUserListService({
        userName: query.userName || undefined,
        email: query.email || undefined,
        role: query.role || undefined,
        status: query.status || undefined,
        currentPage: page,
        pageSize,
      });
      const data = res.data as unknown as { list?: UserRow[]; records?: UserRow[]; total?: number };
      setRows(data?.list || data?.records || []);
      setTotal(data?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [query, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const handleQuery = () => {
    setPage(1);
    load();
  };

  const resetQuery = () => {
    setQuery({ userName: '', email: '', role: '', status: '' });
    setPage(1);
  };

  const handleRoleChange = async (row: UserRow) => {
    const newRole = row.role === 'admin' ? 'user' : 'admin';
    const ok = await confirm({
      title: '修改用户角色',
      description: newRole === 'admin' ? '确定要将该用户升级为管理员吗？' : '确定要将该用户降级为普通用户吗？',
    });
    if (!ok) return;
    const res = await adminUpdateUserRoleService(row.userId!, newRole);
    if (res.code === 200) {
      toast.success('修改用户角色成功');
      setRows((prev) => prev.map((r) => (r.userId === row.userId ? { ...r, role: newRole } : r)));
    }
  };

  const handleStatusChange = async (row: UserRow, status: string) => {
    const res = await adminUpdateUserStatusService(row.userId!, status);
    if (res.code === 200) {
      toast.success('修改用户状态成功');
      setRows((prev) => prev.map((r) => (r.userId === row.userId ? { ...r, status } : r)));
    }
  };

  const handleDelete = async (row: UserRow) => {
    const ok = await confirm({
      title: '删除用户',
      description: '确定要删除该用户吗？此操作不可恢复！',
      danger: true,
      confirmText: '删除',
    });
    if (!ok) return;
    const res = await adminDeleteUserService(row.userId!);
    if (res.code === 200) {
      toast.success('删除用户成功');
      load();
    }
  };

  const submitAdd = async () => {
    if (!form.userName || !form.email) {
      toast.warning('请填写用户名与邮箱');
      return;
    }
    const res = await adminAddUserService(form);
    if (res.code === 200) {
      toast.success('添加用户成功');
      setAddOpen(false);
      setForm({ userName: '', email: '', password: '123456', role: 'user', status: 'active' });
      load();
    }
  };

  const columns: Array<Column<UserRow>> = [
    { key: 'index', label: '#', width: 56, render: (_r, i) => (page - 1) * pageSize + i + 1 },
    {
      key: 'userName',
      label: '用户',
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={r.avatar || undefined} sx={{ width: 34, height: 34 }}>
            {(r.nickName || r.userName || 'U')[0]}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {r.userName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {r.nickName || '未设置昵称'}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    { key: 'email', label: '邮箱' },
    {
      key: 'role',
      label: '角色',
      width: 110,
      render: (r) =>
        r.role === 'admin' ? <Chip label="管理员" color="success" size="small" /> : <Chip label="普通用户" size="small" />,
    },
    {
      key: 'status',
      label: '状态',
      width: 110,
      render: (r) => (
        <Switch
          checked={(r.status ?? 'active') === 'active'}
          onChange={(e) => handleStatusChange(r, e.target.checked ? 'active' : 'inactive')}
          size="small"
        />
      ),
    },
    { key: 'createdAt', label: '注册时间', width: 170, render: (r) => formatDate(r.createdAt) },
    {
      key: 'actions',
      label: '操作',
      width: 220,
      render: (r) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            onClick={() => {
              setCurrent(r);
              setDetailTab('basic');
              setDetailOpen(true);
            }}
          >
            详情
          </Button>
          <Button size="small" onClick={() => handleRoleChange(r)}>
            {r.role === 'admin' ? '降为用户' : '升为管理员'}
          </Button>
          <Button size="small" color="error" onClick={() => handleDelete(r)}>
            删除
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="用户管理" subtitle="管理系统用户、角色与状态" icon={<GroupRoundedIcon />} />

      <Card sx={{ p: 2.5, mb: 3, borderRadius: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            label="用户名"
            size="small"
            value={query.userName}
            onChange={(e) => setQuery((q) => ({ ...q, userName: e.target.value }))}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="邮箱"
            size="small"
            value={query.email}
            onChange={(e) => setQuery((q) => ({ ...q, email: e.target.value }))}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>角色</InputLabel>
            <Select label="角色" value={query.role} onChange={(e) => setQuery((q) => ({ ...q, role: e.target.value }))}>
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="admin">管理员</MenuItem>
              <MenuItem value="user">普通用户</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>状态</InputLabel>
            <Select label="状态" value={query.status} onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value }))}>
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="active">正常</MenuItem>
              <MenuItem value="inactive">禁用</MenuItem>
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={handleQuery} disabled={loading}>
              查询
            </Button>
            <Button variant="outlined" color="inherit" startIcon={<RefreshRoundedIcon />} onClick={resetQuery}>
              重置
            </Button>
          </Stack>
        </Stack>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          用户列表
        </Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)}>
          添加用户
        </Button>
      </Stack>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        rowKey={(r) => r.userId ?? Math.random()}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        emptyText="暂无用户数据"
      />

      {/* 添加用户 */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>添加用户</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="用户名" value={form.userName} onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))} />
            <TextField label="邮箱" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <TextField
              label="密码"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>角色</InputLabel>
              <Select label="角色" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <MenuItem value="admin">管理员</MenuItem>
                <MenuItem value="user">普通用户</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select label="状态" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <MenuItem value="active">正常</MenuItem>
                <MenuItem value="inactive">禁用</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setAddOpen(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={submitAdd}>
            确定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 用户详情 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>用户详情</DialogTitle>
        <DialogContent>
          {current && (
            <Box>
              <Stack alignItems="center" spacing={1} sx={{ mb: 2, mt: 1 }}>
                <Avatar src={current.avatar || undefined} sx={{ width: 90, height: 90 }}>
                  {(current.nickName || current.userName || 'U')[0]}
                </Avatar>
                <Typography variant="h6">{current.nickName || current.userName}</Typography>
                <Chip
                  label={current.role === 'admin' ? '管理员' : '普通用户'}
                  color={current.role === 'admin' ? 'success' : 'default'}
                  size="small"
                />
              </Stack>
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
                <Tab value="basic" label="基本信息" />
                <Tab value="detail" label="详细资料" />
              </Tabs>
              {detailTab === 'basic' ? (
                <InfoList
                  items={[
                    ['用户ID', current.userId],
                    ['用户名', current.userName],
                    ['昵称', current.nickName || '未设置'],
                    ['邮箱', current.email],
                    ['性别', current.sex || '未设置'],
                    ['生日', current.birthday ? formatDate(current.birthday) : '未设置'],
                    ['账号状态', STATUS_LABEL[current.status as string] || current.status],
                    ['注册时间', formatDate(current.createdAt)],
                  ]}
                />
              ) : (
                <InfoList
                  items={[
                    ['自我介绍', current.introduction || '该用户暂未填写自我介绍'],
                    ['第三方平台', current.oauth2Provider || '未绑定'],
                    ['绑定时间', current.oauth2Provider ? formatDate(current.oauth2Expiry) : '—'],
                  ]}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setDetailOpen(false)}>
            关闭
          </Button>
          {current && (
            <>
              <Button
                onClick={() => {
                  handleRoleChange(current);
                  setDetailOpen(false);
                }}
              >
                {current.role === 'admin' ? '降为普通用户' : '升为管理员'}
              </Button>
              <Button
                color="error"
                variant="contained"
                onClick={() => {
                  handleDelete(current);
                  setDetailOpen(false);
                }}
              >
                删除用户
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function InfoList({ items }: { items: Array<[string, unknown]> }) {
  return (
    <Stack spacing={1.25}>
      {items.map(([label, value]) => (
        <Stack key={label} direction="row" sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
            {String(value ?? '—')}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
