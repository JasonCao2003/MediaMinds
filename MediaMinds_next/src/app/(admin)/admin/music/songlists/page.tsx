'use client';

import { Avatar, Chip, Stack, Typography } from '@mui/material';
import PlaylistPlayRoundedIcon from '@mui/icons-material/PlaylistPlayRounded';
import CrudManager from '@/components/admin/CrudManager';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import {
  getAllSongListsService,
  addSongListService,
  updateSongListService,
  deleteSongListService,
} from '@/api/music';
import type { SongList } from '@/types';

const STYLE_OPTIONS = [
  { label: '流行', value: '流行' },
  { label: '摇滚', value: '摇滚' },
  { label: '民谣', value: '民谣' },
  { label: '古典', value: '古典' },
  { label: '电子', value: '电子' },
  { label: '爵士', value: '爵士' },
];

export default function SongListManagementPage() {
  const columns: Array<Column<Record<string, unknown>>> = [
    {
      key: 'title',
      label: '歌单',
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar variant="rounded" src={(r.img as string) || undefined}>
            {(String(r.title ?? '歌'))[0]}
          </Avatar>
          <Typography fontWeight={600}>{String(r.title ?? '')}</Typography>
        </Stack>
      ),
    },
    { key: 'style', label: '风格', width: 120, render: (r) => (r.style ? <Chip size="small" label={String(r.style)} /> : '—') },
    { key: 'introduction', label: '简介' },
  ];

  return (
    <CrudManager
      title="歌单管理"
      subtitle="维护歌单标题、风格与简介"
      icon={<PlaylistPlayRoundedIcon />}
      columns={columns}
      fields={[
        { name: 'title', label: '歌单标题', required: true },
        { name: 'style', label: '风格', type: 'select', options: STYLE_OPTIONS },
        { name: 'introduction', label: '简介', type: 'textarea' },
      ]}
      searchFields={[
        { name: 'title', label: '标题' },
        { name: 'style', label: '风格', type: 'select', options: STYLE_OPTIONS },
      ]}
      fetchList={async (params) => {
        const res = await getAllSongListsService({ ...params });
        return normalizePage<Record<string, unknown>>(res);
      }}
      rowKey={(r) => String(r.id)}
      onCreate={(values) => addSongListService(values as Partial<SongList>)}
      onUpdate={(values) => updateSongListService(String(values.id), values as Partial<SongList>)}
      onDelete={(row) => deleteSongListService(String(row.id))}
      emptyText="暂无歌单数据"
    />
  );
}
