'use client';

import { useState } from 'react';
import {
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import { usePlayerStore } from '@/stores/playerStore';

/**
 * 播放器控制条（单行）。
 *
 * 内容：专辑封面 + 上一首 / 播放暂停 / 下一首。
 * 不显示进度条、标题与音量——纯 UI，音频由 `AudioEngine` 驱动，
 * 因此可以同时挂在桌面侧边栏与移动端贴底条上。
 *
 * 封面可点击打开播放列表（否则播放列表将无从进入），悬停有提示。
 */
export default function GlobalMusicPlayer() {
  const [queueOpen, setQueueOpen] = useState(false);

  const playlist = usePlayerStore((s) => s.playlist);
  const current = usePlayerStore((s) => s.current);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const playing = usePlayerStore((s) => s.playing);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const setIndex = usePlayerStore((s) => s.setIndex);
  const removeFromPlaylist = usePlayerStore((s) => s.removeFromPlaylist);

  if (playlist.length === 0) return null;

  const trackLabel = current ? `${current.name} · ${current.singerName || '未知歌手'}` : '播放列表';

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, width: '100%' }}>
        <Tooltip title={`${trackLabel}（点击查看播放列表）`}>
          <IconButton
            onClick={() => setQueueOpen(true)}
            aria-label={`${trackLabel}，打开播放列表`}
            sx={{ p: 0, width: 44, height: 44, flexShrink: 0, overflow: 'hidden' }}
          >
            <Avatar
              variant="rounded"
              src={current?.pic || undefined}
              sx={{ width: 44, height: 44, bgcolor: 'var(--mm-sunken)', color: 'var(--mm-accent-text)' }}
            >
              <MusicNoteRoundedIcon fontSize="small" />
            </Avatar>
          </IconButton>
        </Tooltip>

        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          justifyContent="center"
          sx={{ flex: 1, minWidth: 0 }}
        >
          <IconButton size="small" onClick={prev} aria-label="上一首">
            <SkipPreviousRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? '暂停' : '播放'}
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              bgcolor: 'var(--mm-accent)',
              color: 'var(--mm-accent-contrast)',
              '&:hover': { bgcolor: 'var(--mm-accent-hover)', color: 'var(--mm-accent-contrast)' },
            }}
          >
            {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
          </IconButton>
          <IconButton size="small" onClick={next} aria-label="下一首">
            <SkipNextRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Drawer
        anchor="right"
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 372,
              bgcolor: 'var(--mm-bg)',
              boxShadow: '0 0 0 3px var(--mm-border-color)',
            },
          },
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={800}>
            播放列表（{playlist.length}）
          </Typography>
          <IconButton onClick={() => setQueueOpen(false)} aria-label="关闭">
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <List sx={{ px: 1.5 }}>
          {playlist.map((track, index) => (
            <ListItemButton
              key={`${track.id}-${index}`}
              selected={index === currentIndex}
              onClick={() => {
                setIndex(index);
                setPlaying(true);
              }}
              sx={{ mb: 0.75, py: 1 }}
            >
              <Avatar variant="rounded" src={track.pic || undefined} sx={{ width: 42, height: 42, mr: 1.5 }}>
                <MusicNoteRoundedIcon fontSize="small" />
              </Avatar>
              <ListItemText
                primary={track.name}
                secondary={track.singerName || '未知歌手'}
                primaryTypographyProps={{ noWrap: true, fontWeight: index === currentIndex ? 700 : 500 }}
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromPlaylist(index);
                }}
                aria-label="移除"
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </>
  );
}
