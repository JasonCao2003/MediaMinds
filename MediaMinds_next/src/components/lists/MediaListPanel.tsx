'use client';

import { Box, Card, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AutoGrid from '@/components/common/AutoGrid';

export interface MediaListSummary {
  id: number;
  name: string;
  description?: string;
  count: number;
}

/**
 * 书单 / 播单列表（与音乐页「歌单」布局一致）。
 * 具体数据由页面归一化后传入，组件只负责展示与操作入口。
 */
export default function MediaListPanel({
  lists,
  loading,
  icon,
  unit,
  newLabel,
  onCreate,
  onOpen,
  onEdit,
  onDelete,
}: {
  lists: MediaListSummary[];
  loading?: boolean;
  icon: React.ReactNode;
  /** 数量单位：本 / 部 */
  unit: string;
  newLabel: string;
  onCreate: () => void;
  onOpen: (list: MediaListSummary) => void;
  onEdit: (list: MediaListSummary) => void;
  onDelete: (list: MediaListSummary) => void;
}) {
  if (loading && lists.length === 0) {
    return (
      <AutoGrid minWidth={220}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} sx={{ borderRadius: 'var(--mm-radius-lg)', overflow: 'hidden' }}>
            <Skeleton variant="rectangular" height={150} />
            <Box sx={{ p: 1.75 }}>
              <Skeleton variant="text" />
            </Box>
          </Card>
        ))}
      </AutoGrid>
    );
  }

  return (
    <AutoGrid minWidth={220}>
      {lists.map((list) => (
        <Card
          key={list.id}
          className="mm-hover-lift"
          role="button"
          tabIndex={0}
          onClick={() => onOpen(list)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpen(list);
            }
          }}
          sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', borderRadius: 'var(--mm-radius-lg)' }}
        >
          <Box sx={{ height: 150, bgcolor: 'var(--mm-sunken)', display: 'grid', placeItems: 'center' }}>
            {icon}
          </Box>
          <Box sx={{ p: 1.75 }}>
            <Typography variant="subtitle2" fontWeight={800} noWrap>
              {list.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {list.count} {unit}
              {list.description ? ` · ${list.description}` : ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 10, right: 10 }}>
            <Tooltip title="编辑">
              <IconButton
                size="small"
                aria-label="编辑列表"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(list);
                }}
                sx={{ bgcolor: 'var(--mm-bg)', boxShadow: 'var(--mm-float)', '&:hover': { bgcolor: 'var(--mm-bg)' } }}
              >
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="删除">
              <IconButton
                size="small"
                aria-label="删除列表"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(list);
                }}
                sx={{ bgcolor: 'var(--mm-bg)', boxShadow: 'var(--mm-float)', '&:hover': { bgcolor: 'var(--mm-bg)' } }}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Card>
      ))}

      <Card
        className="mm-hover-lift"
        role="button"
        tabIndex={0}
        onClick={onCreate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCreate();
          }
        }}
        sx={{
          minHeight: 200,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          borderRadius: 'var(--mm-radius-lg)',
          bgcolor: 'var(--mm-sunken)',
          boxShadow: 'var(--mm-sunken-sm)',
        }}
      >
        <Stack alignItems="center" spacing={1}>
          <AddRoundedIcon sx={{ fontSize: 40 }} />
          <Typography variant="subtitle2" fontWeight={800}>
            {newLabel}
          </Typography>
        </Stack>
      </Card>
    </AutoGrid>
  );
}
