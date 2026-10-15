'use client';

import { Avatar, Chip, Stack, Typography } from '@mui/material';
import AlbumRoundedIcon from '@mui/icons-material/AlbumRounded';
import CrudManager from '@/components/admin/CrudManager';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import {
  getAllSingersService,
  addSingerService,
  updateSingerService,
  deleteSingerService,
} from '@/api/music';
import type { Singer } from '@/types';

const SEX_OPTIONS = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
  { label: '组合', value: '组合' },
];

export default function SingerManagementPage() {
  const columns: Array<Column<Record<string, unknown>>> = [
    {
      key: 'name',
      label: '歌手',
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={(r.avatar as string) || undefined}>{(String(r.name ?? '歌'))[0]}</Avatar>
          <Typography fontWeight={600}>{String(r.name ?? '')}</Typography>
        </Stack>
      ),
    },
    {
      key: 'sex',
      label: '性别',
      width: 100,
      render: (r) => (r.sex ? <Chip size="small" label={String(r.sex)} /> : '—'),
    },
    { key: 'birth', label: '出生日期', width: 140 },
    { key: 'location', label: '所在地区', width: 160 },
    { key: 'introduction', label: '简介' },
  ];

  return (
    <CrudManager
      title="歌手管理"
      subtitle="维护歌手档案与头像"
      icon={<AlbumRoundedIcon />}
      columns={columns}
      fields={[
        { name: 'name', label: '歌手名称', required: true },
        { name: 'sex', label: '性别', type: 'select', options: SEX_OPTIONS },
        { name: 'birth', label: '出生日期', helperText: '格式：YYYY-MM-DD' },
        { name: 'location', label: '所在地区' },
        { name: 'introduction', label: '简介', type: 'textarea' },
      ]}
      searchFields={[
        { name: 'name', label: '歌手名称' },
        { name: 'sex', label: '性别', type: 'select', options: SEX_OPTIONS },
      ]}
      fetchList={async (params) => {
        const res = await getAllSingersService({ ...params });
        return normalizePage<Record<string, unknown>>(res);
      }}
      rowKey={(r) => String(r.id)}
      onCreate={(values) => addSingerService(values as Partial<Singer>)}
      onUpdate={(values) => updateSingerService(values as Partial<Singer>)}
      onDelete={(row) => deleteSingerService(String(row.id))}
      emptyText="暂无歌手数据"
    />
  );
}
