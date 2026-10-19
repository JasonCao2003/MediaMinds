'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { usePlayerStore } from '@/stores/playerStore';
import { getKugouLyricService } from '@/api/kugou';
import { parseLyrics, activeLyricIndex } from '@/lib/lyric';

/** 秒 → m:ss */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 播放界面。
 *
 * <p>点歌曲封面播放时自动进入；也可点侧边栏播放器的封面进入，不需要额外按钮。
 * 音频仍由全局唯一的 `AudioEngine` 驱动，这里只读同一个 `<audio>` 的时间做进度展示。
 */
export default function MusicPlayingPage() {
  const router = useRouter();
  const playlist = usePlayerStore((s) => s.playlist);
  const current = usePlayerStore((s) => s.current);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const playing = usePlayerStore((s) => s.playing);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const setIndex = usePlayerStore((s) => s.setIndex);
  const removeFromPlaylist = usePlayerStore((s) => s.removeFromPlaylist);
  const updateCurrent = usePlayerStore((s) => s.updateCurrent);

  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // AudioEngine 的 <audio> 是全局唯一的，这里直接挂监听读进度
  useEffect(() => {
    const audio = document.querySelector('audio');
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => setTime(audio.duration || 0);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('ended', onEnded);
    onTime();
    onMeta();
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, [current?.id]);

  // 缺歌词时按酷狗 hash 现取一次（在线播放 / 刚导入的歌都可能还没有歌词）
  useEffect(() => {
    if (!current?.hash || current.lyrics) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getKugouLyricService(current.hash!, current.albumAudioId ?? '', current.name);
        const data = res.data as unknown as { lyrics?: string; lyric?: string } | string;
        const text = typeof data === 'string' ? data : data?.lyrics || data?.lyric || '';
        if (!cancelled && text && text !== '暂无歌词') {
          updateCurrent({ lyrics: text });
        }
      } catch {
        /* 拿不到就继续显示「暂无歌词」 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.hash, current?.lyrics, current?.name, current?.albumAudioId, updateCurrent]);

  const seek = (value: number) => {
    const audio = document.querySelector('audio');
    if (audio && Number.isFinite(value)) {
      audio.currentTime = value;
      setTime(value);
    }
  };

  const lyricLines = useMemo(() => parseLyrics(current?.lyrics), [current?.lyrics]);
  const activeLine = useMemo(() => activeLyricIndex(lyricLines, time), [lyricLines, time]);
  const lyricRefs = useRef<Array<HTMLDivElement | null>>([]);

  // 歌词随播放滚动：当前行滚到中间（瞬时，不加动画）
  useEffect(() => {
    if (activeLine < 0) return;
    lyricRefs.current[activeLine]?.scrollIntoView({ block: 'center' });
  }, [activeLine]);

  if (!current) {
    return (
      <Box>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()} sx={{ mb: 3 }}>
          返回
        </Button>
        <EmptyState
          icon={<HeadphonesRoundedIcon sx={{ fontSize: 64 }} />}
          title="还没有正在播放的歌曲"
          description="在音乐页点击歌曲封面即可播放并进入这里"
          action={
            <Button variant="contained" onClick={() => router.push('/content/music')}>
              去音乐页
            </Button>
          }
        />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()}>
          返回
        </Button>
        <Typography variant="h6" fontWeight={800} noWrap sx={{ flex: 1 }}>
          正在播放
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 340px) minmax(0, 1fr)' },
          gap: 3.5,
          alignItems: 'start',
        }}
      >
        <Card sx={{ p: 2.5, borderRadius: 'var(--mm-radius-lg)' }}>
          <Box sx={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', bgcolor: 'var(--mm-sunken)' }}>
            <CoverImage
              src={current.pic}
              alt={current.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </Box>
          <Typography variant="h6" fontWeight={800} sx={{ mt: 2 }} noWrap>
            {current.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {current.singerName || '未知歌手'}
          </Typography>

          <Slider
            min={0}
            max={Math.max(1, duration)}
            value={Math.min(time, Math.max(1, duration))}
            onChange={(_, value) => seek(value as number)}
            sx={{ mt: 2 }}
            aria-label="播放进度"
          />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {formatTime(time)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTime(duration)}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mt: 1 }}>
            <IconButton onClick={prev} aria-label="上一首">
              <SkipPreviousRoundedIcon />
            </IconButton>
            <IconButton
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? '暂停' : '播放'}
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'var(--mm-accent)',
                color: 'var(--mm-accent-contrast)',
                '&:hover': { bgcolor: 'var(--mm-accent-hover)', color: 'var(--mm-accent-contrast)' },
              }}
            >
              {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
            </IconButton>
            <IconButton onClick={next} aria-label="下一首">
              <SkipNextRoundedIcon />
            </IconButton>
          </Stack>
        </Card>

        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Card sx={{ p: 2.5, borderRadius: 'var(--mm-radius-lg)' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
              播放列表（{playlist.length}）
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <List sx={{ maxHeight: 260, overflowY: 'auto' }}>
              {playlist.map((track, index) => (
                <ListItemButton
                  key={`${track.id}-${index}`}
                  selected={index === currentIndex}
                  onClick={() => {
                    setIndex(index);
                    setPlaying(true);
                  }}
                  sx={{ mb: 0.5 }}
                >
                  <ListItemText
                    primary={track.name}
                    secondary={track.singerName || '未知歌手'}
                    slotProps={{ primary: { noWrap: true, fontWeight: index === currentIndex ? 700 : 500 } }}
                  />
                  <Tooltip title="从播放列表移除">
                    <IconButton
                      size="small"
                      aria-label="从播放列表移除"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromPlaylist(index);
                      }}
                    >
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              ))}
            </List>
          </Card>

          <Card sx={{ p: 2.5, borderRadius: 'var(--mm-radius-lg)' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
              歌词
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {lyricLines.length === 0 ? (
                <Typography color="text.secondary">该歌曲暂无歌词</Typography>
              ) : (
                lyricLines.map((line, index) => (
                  <Box
                    key={`${index}-${line.time}`}
                    ref={(el: HTMLDivElement | null) => {
                      lyricRefs.current[index] = el;
                    }}
                    onClick={() => line.time >= 0 && seek(line.time)}
                    sx={{
                      py: 0.5,
                      lineHeight: 1.8,
                      cursor: line.time >= 0 ? 'pointer' : 'default',
                      fontWeight: index === activeLine ? 800 : 400,
                      color: index === activeLine ? 'var(--mm-accent-text)' : 'text.secondary',
                    }}
                  >
                    {line.text}
                  </Box>
                ))
              )}
            </Box>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}
