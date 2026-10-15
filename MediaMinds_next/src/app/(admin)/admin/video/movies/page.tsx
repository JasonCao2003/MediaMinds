'use client';

import { useEffect, useState } from 'react';
import { Avatar, Rating, Stack, Typography } from '@mui/material';
import LocalMoviesRoundedIcon from '@mui/icons-material/LocalMoviesRounded';
import CrudManager, { type CrudField } from '@/components/admin/CrudManager';
import UploadAction from '@/components/admin/UploadAction';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import {
  getMovieListService,
  addMovieService,
  updateMovieService,
  deleteMovieService,
  updateMovieCoverService,
  updateMovieVideoService,
  getAllCategoriesService,
} from '@/api/video';
import type { Movie } from '@/types';

export default function MovieManagePage() {
  const [categoryOptions, setCategoryOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getAllCategoriesService()
      .then((res) => {
        const list = (res.data as unknown as Array<{ name: string }>) || [];
        setCategoryOptions(list.map((c) => ({ label: c.name, value: c.name })));
      })
      .catch(() => undefined);
  }, []);

  const columns: Array<Column<Record<string, unknown>>> = [
    { key: 'id', label: 'ID', width: 70 },
    {
      key: 'name',
      label: '电影',
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar variant="rounded" src={(r.pic as string) || (r.picture as string) || (r.cover as string) || undefined}>
            {(String(r.name ?? '影'))[0]}
          </Avatar>
          <Typography fontWeight={600}>{String(r.name ?? '')}</Typography>
        </Stack>
      ),
    },
    { key: 'directedBy', label: '导演', width: 140 },
    { key: 'actor', label: '主演', width: 160 },
    { key: 'type', label: '分类', width: 110 },
    { key: 'time', label: '时长(分)', width: 100, align: 'center' },
    {
      key: 'rate',
      label: '评分',
      width: 150,
      render: (r) => <Rating value={Number(r.rate) || 0} readOnly size="small" precision={0.1} />,
    },
  ];

  const fields: CrudField[] = [
    { name: 'name', label: '电影名称', required: true },
    { name: 'directedBy', label: '导演' },
    { name: 'actor', label: '主演' },
    { name: 'type', label: '分类', type: 'select', options: categoryOptions },
    { name: 'time', label: '时长(分钟)', type: 'number' },
    { name: 'area', label: '地区' },
    { name: 'language', label: '语言' },
    { name: 'showTime', label: '上映时间' },
    { name: 'abs', label: '简介', type: 'textarea' },
    { name: 'info', label: '详细信息', type: 'textarea' },
  ];

  return (
    <CrudManager
      key={reloadKey}
      title="电影管理"
      subtitle="维护影片元数据、封面与视频文件"
      icon={<LocalMoviesRoundedIcon />}
      columns={columns}
      fields={fields}
      searchFields={[
        { name: 'keyword', label: '关键词' },
        { name: 'type', label: '分类', type: 'select', options: categoryOptions },
      ]}
      fetchList={async (params) => {
        const res = await getMovieListService(Number(params.page), Number(params.size), {
          keyword: params.keyword,
          type: params.type,
        });
        return normalizePage<Record<string, unknown>>(res);
      }}
      rowKey={(r) => String(r.id)}
      onCreate={(values) => addMovieService(values as Partial<Movie>)}
      onUpdate={(values) => updateMovieService(values as Partial<Movie>)}
      onDelete={(row) => deleteMovieService(String(row.id))}
      extraRowActions={(row) => (
        <Stack direction="row" spacing={0.5}>
          <UploadAction
            label="封面"
            onUpload={(file) => updateMovieCoverService(String(row.id), file)}
            onDone={() => setReloadKey((k) => k + 1)}
          />
          <UploadAction
            label="视频"
            accept="video/*"
            color="secondary"
            onUpload={(file) => updateMovieVideoService(String(row.id), file)}
            onDone={() => setReloadKey((k) => k + 1)}
          />
        </Stack>
      )}
      emptyText="暂无电影数据"
    />
  );
}
