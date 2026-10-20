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
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import type { MediaListSummary } from './MediaListPanel';

/**
 * 「加入书单 / 播单」选择弹窗。
 * 与音乐页的「加入歌单」一致：只负责选择目标列表，列表为空时引导新建。
 */
export default function AddToListDialog({
  open,
  title,
  itemTitle,
  lists,
  unit,
  icon,
  onAdd,
  onClose,
  onCreate,
}: {
  open: boolean;
  title: string;
  itemTitle?: string;
  lists: MediaListSummary[];
  unit: string;
  icon?: React.ReactNode;
  onAdd: (listId: number) => Promise<boolean>;
  onClose: () => void;
  onCreate: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);

  const add = async (listId: number) => {
    setBusy(listId);
    try {
      const ok = await onAdd(listId);
      if (ok) onClose();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pt: 2.5 }}>{title}</DialogTitle>
      <DialogContent>
        {itemTitle && (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1.5 }}>
            {itemTitle}
          </Typography>
        )}

        {lists.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 1.5 }}>
            还没有列表，先新建一个吧。
          </Typography>
        ) : (
          <List sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {lists.map((list) => (
              <ListItemButton key={list.id} onClick={() => add(list.id)} disabled={busy != null}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {busy === list.id ? <CircularProgress size={20} /> : icon ?? <PlaylistAddRoundedIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={list.name}
                  secondary={`${list.count} ${unit}${list.description ? ` · ${list.description}` : ''}`}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
        <Button onClick={onCreate}>新建</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
