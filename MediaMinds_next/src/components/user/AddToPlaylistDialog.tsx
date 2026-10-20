'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import { toast } from '@/lib/notify';
import { addListSongService } from '@/api/music';

/**
 * 「加入歌单」弹窗。
 *
 * <p>把「我的收藏」也作为一个特殊歌单列在第一位，其余为自建歌单；
 * 点击即加入，重复添加由后端 409 提示。
 */
export default function AddToPlaylistDialog({
  open,
  song,
  songLists,
  onClose,
  onChanged,
  onCreatePlaylist,
  onAddFavorite,
}: {
  open: boolean;
  song: Record<string, unknown> | null;
  songLists: Record<string, unknown>[];
  onClose: () => void;
  onChanged: () => void;
  onCreatePlaylist: () => void;
  onAddFavorite?: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<number | 'favorite' | null>(null);
  const songId = song?.id == null ? null : Number(song.id);

  const addToList = async (list: Record<string, unknown>) => {
    const songListId = Number(list.id);
    if (songId == null || !songListId) return;
    setBusy(songListId);
    try {
      const res = await addListSongService({ songId, songListId });
      if (res.code === 200) {
        toast.success(`已加入「${String(list.title ?? '歌单')}」`);
        onChanged();
        onClose();
      }
    } catch {
      /* 重复添加由拦截器提示（409） */
    } finally {
      setBusy(null);
    }
  };

  const addFavorite = async () => {
    if (!onAddFavorite || songId == null) return;
    setBusy('favorite');
    try {
      const ok = await onAddFavorite();
      if (ok) onClose();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pt: 2.5 }}>加入歌单</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1.5 }}>
          {String(song?.name ?? '')}
        </Typography>

        {onAddFavorite || songLists.length > 0 ? (
          <List sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {onAddFavorite && (
              <ListItemButton onClick={addFavorite} disabled={busy != null || songId == null}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {busy === 'favorite' ? <CircularProgress size={20} /> : <FavoriteRoundedIcon />}
                </ListItemIcon>
                <ListItemText primary="我的收藏" secondary="特殊歌单" />
              </ListItemButton>
            )}
            {songLists.map((list) => (
              <ListItemButton
                key={String(list.id)}
                onClick={() => addToList(list)}
                disabled={busy != null || songId == null}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <LibraryMusicRoundedIcon />
                </ListItemIcon>
                <ListItemText
                  primary={String(list.title ?? '未命名歌单')}
                  secondary={list.style ? String(list.style) : undefined}
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 1.5 }}>
            还没有自建歌单，先新建一个吧。
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
        <Button onClick={onCreatePlaylist}>新建歌单</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
