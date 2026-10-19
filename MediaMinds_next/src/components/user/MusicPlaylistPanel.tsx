'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Card, IconButton, Skeleton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AutoGrid from '@/components/common/AutoGrid';
import CoverImage from '@/components/common/CoverImage';
import { getListSongBySongListIdService } from '@/api/music';
import { normalizePage } from '@/lib/page';

/**
 * 歌单页：虚拟的「我的收藏」+ 真实歌单 + 新建入口。
 *
 * <p>「收藏」不再是一个独立 Tab，而是一个**特殊歌单**；管理歌单也收进这一页，
 * 顶部工具栏不再需要「管理歌单」按钮。
 */
export default function MusicPlaylistPanel({
  songLists,
  favoriteCount,
  loading,
  onOpenFavorite,
  onOpenList,
  onCreate,
  onEdit,
  onDelete,
}: {
  songLists: Record<string, unknown>[];
  favoriteCount: number;
  loading: boolean;
  onOpenFavorite: () => void;
  onOpenList: (list: Record<string, unknown>) => void;
  onCreate: () => void;
  onEdit: (list: Record<string, unknown>) => void;
  onDelete: (list: Record<string, unknown>) => void;
}) {
  const { mm } = useTheme();
  const [counts, setCounts] = useState<Record<number, number>>({});

  /** 每个歌单的歌曲数：用 pageSize=1 只取 total */
  const loadCounts = useCallback(async () => {
    if (songLists.length === 0) {
      setCounts({});
      return;
    }
    const entries = await Promise.all(
      songLists.map(async (list) => {
        const id = Number(list.id);
        if (!id) return [0, 0] as const;
        try {
          const res = await getListSongBySongListIdService(id, { pageNum: 1, pageSize: 1 });
          return [id, normalizePage(res).total] as const;
        } catch {
          return [id, 0] as const;
        }
      }),
    );
    setCounts(Object.fromEntries(entries.filter(([id]) => id > 0)));
  }, [songLists]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  if (loading && songLists.length === 0) {
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
      {/* 特殊歌单：我的收藏 */}
      <PlaylistCard
        title="我的收藏"
        caption={`${favoriteCount} 首`}
        icon={<FavoriteRoundedIcon sx={{ fontSize: 44, color: mm.warning }} />}
        onClick={onOpenFavorite}
      />

      {songLists.map((list) => (
        <PlaylistCard
          key={String(list.id)}
          title={String(list.title ?? '未命名歌单')}
          caption={`${counts[Number(list.id)] ?? 0} 首${list.style ? ` · ${String(list.style)}` : ''}`}
          cover={list.pic ? String(list.pic) : undefined}
          onClick={() => onOpenList(list)}
          actions={
            <>
              <Tooltip title="编辑歌单">
                <IconButton
                  size="small"
                  aria-label="编辑歌单"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(list);
                  }}
                  sx={{ bgcolor: 'var(--mm-bg)', boxShadow: 'var(--mm-float)', '&:hover': { bgcolor: 'var(--mm-bg)' } }}
                >
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="删除歌单">
                <IconButton
                  size="small"
                  aria-label="删除歌单"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(list);
                  }}
                  sx={{ bgcolor: 'var(--mm-bg)', boxShadow: 'var(--mm-float)', '&:hover': { bgcolor: 'var(--mm-bg)' } }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          }
        />
      ))}

      {/* 新建歌单 */}
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
            新建歌单
          </Typography>
        </Stack>
      </Card>
    </AutoGrid>
  );
}

function PlaylistCard({
  title,
  caption,
  cover,
  icon,
  actions,
  onClick,
}: {
  title: string;
  caption: string;
  cover?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Card
      className="mm-hover-lift"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', borderRadius: 'var(--mm-radius-lg)' }}
    >
      <Box sx={{ height: 150, bgcolor: 'var(--mm-sunken)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {cover ? (
          <CoverImage
            src={cover}
            alt={title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          icon ?? <LibraryMusicRoundedIcon sx={{ fontSize: 44 }} />
        )}
      </Box>
      <Box sx={{ p: 1.75 }}>
        <Typography variant="subtitle2" fontWeight={800} noWrap>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {caption}
        </Typography>
      </Box>
      {actions && (
        <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 10, right: 10 }}>
          {actions}
        </Stack>
      )}
    </Card>
  );
}
