'use client';

import { Avatar, Chip, Rating, Stack, Typography } from '@mui/material';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import CrudManager from '@/components/admin/CrudManager';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import { getCommentsByMovieIdService, deleteVideoCommentService } from '@/api/video';

export default function VideoCommentManagePage() {
  const columns: Array<Column<Record<string, unknown>>> = [
    { key: 'id', label: 'ID', width: 80 },
    {
      key: 'userId',
      label: '用户',
      width: 120,
      render: (r) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, fontSize: 13 }}>{(String(r.userId ?? 'U'))[0]}</Avatar>
          <Typography variant="body2">{String(r.userId ?? '—')}</Typography>
        </Stack>
      ),
    },
    { key: 'content', label: '评论内容', render: (r) => <Typography variant="body2">{String(r.content ?? '')}</Typography> },
    {
      key: 'rate',
      label: '评分',
      width: 150,
      render: (r) => <Rating value={Number(r.rate) || 0} readOnly size="small" />,
    },
    { key: 'createTime', label: '评论时间', width: 190 },
  ];

  return (
    <CrudManager
      title="视频评论管理"
      subtitle="按影片查看与管理评论"
      icon={<ChatBubbleRoundedIcon />}
      columns={columns}
      searchFields={[{ name: 'movieId', label: '影片 ID' }]}
      fetchList={async (params) => {
        if (!params.movieId) return { rows: [], total: 0 };
        const res = await getCommentsByMovieIdService(String(params.movieId), Number(params.page), Number(params.size));
        return normalizePage<Record<string, unknown>>(res);
      }}
      rowKey={(r) => String(r.id)}
      onDelete={(row) => deleteVideoCommentService(String(row.id))}
      emptyText="请输入影片 ID 后查询评论"
    />
  );
}
