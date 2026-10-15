'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Slider,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 全局持久化音乐播放器（对应 Vue 版 GlobalMusicPlayer）。
 * 固定在用户端底部，跨路由保持播放状态。
 */
export default function GlobalMusicPlayer() {
  const theme = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const { playlist, current, currentIndex, playing, next, prev, setPlaying, removeFromPlaylist, setIndex } =
    usePlayerStore();
  const role = useAuthStore((s) => s.info?.role);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.url) return;
    if (audio.src !== current.url) {
      audio.src = current.url;
      audio.load();
    }
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [current, playing, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // 非普通用户不显示播放器（与 Vue 版一致）
  if (role && role !== 'user') return null;
  if (playlist.length === 0) return null;

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) setProgress(audio.currentTime);
  };

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={next}
        preload="metadata"
      />

      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (t) => t.zIndex.appBar + 1,
          px: { xs: 1.5, md: 3 },
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, md: 2.5 },
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(15,20,35,.92)' : 'rgba(255,255,255,.92)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -6px 24px rgba(15,23,42,.08)',
          animation: 'mm-fade-in 300ms cubic-bezier(.2,0,0,1) both',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: { xs: 1, md: '0 1 280px' } }}>
          <Avatar
            variant="rounded"
            src={current?.pic || undefined}
            sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}
          >
            <MusicNoteRoundedIcon />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {current?.name || '未选择歌曲'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {current?.singerName || '未知歌手'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton onClick={prev} aria-label="上一首">
            <SkipPreviousRoundedIcon />
          </IconButton>
          <IconButton
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? '暂停' : '播放'}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              width: 46,
              height: 46,
              transition: 'transform 180ms cubic-bezier(.2,0,0,1)',
              '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.06)' },
            }}
          >
            {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
          </IconButton>
          <IconButton onClick={next} aria-label="下一首">
            <SkipNextRoundedIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, display: { xs: 'none', md: 'flex' } }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 44, textAlign: 'right' }}>
            {formatTime(progress)}
          </Typography>
          <Slider
            size="small"
            value={progress}
            max={duration || 100}
            onChange={(_, value) => {
              const v = value as number;
              setProgress(v);
              if (audioRef.current) audioRef.current.currentTime = v;
            }}
            sx={{ flex: 1 }}
            aria-label="播放进度"
          />
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 44 }}>
            {formatTime(duration)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'none', lg: 'flex' } }}>
          <IconButton size="small" onClick={() => setMuted((m) => !m)} aria-label={muted ? '取消静音' : '静音'}>
            {muted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
          </IconButton>
          <Slider
            size="small"
            value={muted ? 0 : volume * 100}
            onChange={(_, v) => {
              setMuted(false);
              setVolume((v as number) / 100);
            }}
            sx={{ width: 90 }}
            aria-label="音量"
          />
        </Stack>

        <Tooltip title="播放列表">
          <IconButton onClick={() => setQueueOpen(true)} aria-label="播放列表">
            <QueueMusicRoundedIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Drawer
        anchor="right"
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        slotProps={{ paper: { sx: { width: 360, borderRadius: '18px 0 0 18px' } } }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>
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
              sx={{ borderRadius: 2.5, mb: 0.5 }}
            >
              <Avatar variant="rounded" src={track.pic || undefined} sx={{ width: 40, height: 40, mr: 1.5 }}>
                <MusicNoteRoundedIcon fontSize="small" />
              </Avatar>
              <ListItemText
                primary={track.name}
                secondary={track.singerName || '未知歌手'}
                primaryTypographyProps={{ noWrap: true, fontWeight: index === currentIndex ? 600 : 400 }}
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
