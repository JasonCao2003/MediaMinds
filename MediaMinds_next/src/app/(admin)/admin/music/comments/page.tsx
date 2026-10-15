'use client';

import { Avatar, Chip, Stack, Typography } from '@mui/material';
import CommentRoundedIcon from '@mui/icons-material/CommentRounded';
import CrudManager from '@/components/admin/CrudManager';
import type { Column } from '@/components/common/DataTable';
import { normalizePage } from '@/lib/page';
import { getCommentsService, deleteCommentService, updateCommentService } from '@/api/music';

export default function MusicCommentManagementPage() {
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
    { key: 'up', label: '点赞数', width: 100, align: 'center', render: (r) => <Chip size="small" label={String(r.up ?? 0)} /> },
    { key: 'createTime', label: '评论时间', width: 190 },
  ];

  return (
    <CrudManager
      title="音乐评论管理"
      subtitle="查看与管理歌曲评论"
      icon={<CommentRoundedIcon />}
      columns={columns}
      fields={[{ name: 'content', label: '评论内容', type: 'textarea', required: true }]}
      searchFields={[{ name: 'content', label: '评论内容' }]}
      fetchList={async (params) => {
        const res = await getCommentsService({ ...params });
        return normalizePage<Record<string, unknown>>(res);
      }}
      rowKey={(r) => String(r.id)}
      onUpdate={(values) => updateCommentService(String(values.id), values)}
      onDelete={(row) => deleteCommentService(String(row.id))}
      emptyText="暂无评论数据"
    />
  );
}
