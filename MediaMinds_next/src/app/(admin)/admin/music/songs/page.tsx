'use client';

import { useEffect, useState } from 'react';
import { Avatar, Stack, Typography } from '@mui/material';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import CrudManager, { type CrudField } from '@/components/admin/CrudManager';
import UploadAction from '@/components/admin/UploadAction';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import {
  getAllSongsService,
  addSongService,
  updateSongService,
  deleteSongService,
  uploadSongCoverService,
  uploadSongFileService,
  getAllSingersService,
} from '@/api/music';
import type { Song } from '@/types';

export default function SongManagementPage() {
  const [singerOptions, setSingerOptions] = useState<Array<{ label: string; value: string | number }>>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getAllSingersService({ pageNum: 1, pageSize: 200 })
      .then((res) => {
        const { rows } = normalizePage<{ id: number; name: string }>(res);
        setSingerOptions(rows.map((s) => ({ label: s.name, value: s.id })));
      })
      .catch(() => undefined);
  }, []);

  const columns: Array<Column<Record<string, unknown>>> = [
    {
      key: 'name',
      label: '歌曲',
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar variant="rounded" src={(r.pic as string) || undefined}>
            {(String(r.name ?? '歌'))[0]}
          </Avatar>
          <Typography fontWeight={600}>{String(r.name ?? '')}</Typography>
        </Stack>
      ),
    },
    { key: 'introduction', label: '简介' },
    { key: 'createTime', label: '上传时间', width: 180 },
    { key: 'updateTime', label: '更新时间', width: 180 },
  ];

  const fields: CrudField[] = [
    { name: 'name', label: '歌曲名称', required: true },
    { name: 'singerId', label: '歌手', type: 'select', options: singerOptions },
    { name: 'introduction', label: '简介', type: 'textarea' },
    { name: 'lyric', label: '歌词', type: 'textarea' },
  ];

  return (
    <CrudManager
      key={reloadKey}
      title="歌曲管理"
      subtitle="维护歌曲信息、封面、音频与歌词"
      icon={<LibraryMusicRoundedIcon />}
      columns={columns}
      fields={fields}
      searchFields={[
        { name: 'name', label: '歌曲名称' },
        { name: 'singerId', label: '歌手', type: 'select', options: singerOptions },
      ]}
      fetchList={async (params) => {
        const res = await getAllSongsService({
          pageNum: params.page,
          pageSize: params.size,
          name: params.name,
          singerId: params.singerId,
        });
        return normalizePage<Record<string, unknown>>(res);
      }}
      rowKey={(r) => String(r.id)}
      onCreate={(values) => addSongService(values as Record<string, unknown>)}
      onUpdate={(values) => updateSongService(String(values.id), values as Record<string, unknown>)}
      onDelete={(row) => deleteSongService(String(row.id))}
      extraRowActions={(row) => (
        <Stack direction="row" spacing={0.5}>
          <UploadAction
            label="封面"
            onUpload={(file) => uploadSongCoverService(String(row.id), file)}
            onDone={() => setReloadKey((k) => k + 1)}
          />
          <UploadAction
            label="音频"
            accept="audio/*"
            color="secondary"
            onUpload={(file) => uploadSongFileService(String(row.id), file)}
            onDone={() => setReloadKey((k) => k + 1)}
          />
        </Stack>
      )}
      emptyText="暂无歌曲数据"
    />
  );
}
