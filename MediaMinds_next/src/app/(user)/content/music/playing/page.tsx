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
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import AgentAnalysisDialog from '@/components/common/AgentAnalysisDialog';
import { usePlayerStore } from '@/stores/playerStore';
import { getKugouLyricService } from '@/api/kugou';
import { analyzeTextService, type TextAnalysisResult } from '@/api/agent';
import { toast } from '@/lib/notify';
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

  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TextAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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
  const lyricText = (current?.lyrics || '').trim();
  const hasLyrics = lyricLines.length > 0 || (Boolean(lyricText) && lyricText !== '暂无歌词');

  const analyzeLyrics = async () => {
    // 优先用解析后的歌词（去掉 LRC / KRC 时间标签），没有再退回原文
    const text = lyricLines.length
      ? lyricLines.map((line) => line.text).join('\n')
      : (current?.lyrics || '').trim();
    if (!text.trim()) {
      toast.info('该歌曲暂无歌词，无法分析');
      return;
    }
    setAnalysisOpen(true);
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
      const res = await analyzeTextService({
        kind: 'lyric',
        title: current?.name,
        context: current?.singerName,
        text,
      });
      setAnalysisResult(res.data);
    } catch (e) {
      setAnalysisError((e as { message?: string })?.message || '分析失败，请稍后重试');
    } finally {
      setAnalysisLoading(false);
    }
  };

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

      {/* 舞台：大封面 + 右侧歌词，参考沉浸式播放器布局 */}
      <Card
        sx={{
          position: 'relative',
          p: { xs: 2.5, md: 4 },
          mb: 3,
          borderRadius: 'var(--mm-radius-lg)',
          bgcolor: 'var(--mm-sunken)',
          boxShadow: 'var(--mm-raised-lg)',
          overflow: 'hidden',
        }}
      >
        {current.pic && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url("${current.pic}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.14,
              pointerEvents: 'none',
            }}
          />
        )}
        <Box
          sx={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 390px) minmax(0, 1fr)' },
            gap: { xs: 3.5, md: 5 },
            alignItems: 'center',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 'min(100%, 360px)',
                mx: { xs: 'auto', md: 0 },
                aspectRatio: '1 / 1',
                overflow: 'hidden',
                bgcolor: 'var(--mm-bg)',
                boxShadow: 'var(--mm-float)',
              }}
            >
              <CoverImage
                src={current.pic}
                alt={current.name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>

            <Typography variant="h4" fontWeight={800} sx={{ mt: 2.5, fontSize: { xs: '1.5rem', md: '2rem' } }} noWrap>
              {current.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" noWrap>
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
                  width: 60,
                  height: 60,
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

            <Tooltip title="用 Agent 分析歌词情感">
              <span style={{ display: 'block' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SmartToyRoundedIcon />}
                  onClick={analyzeLyrics}
                  disabled={!hasLyrics}
                  sx={{ mt: 2 }}
                >
                  Agent · 歌词情感分析
                </Button>
              </span>
            </Tooltip>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
              歌词
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ maxHeight: { xs: '46vh', md: '62vh' }, overflowY: 'auto', pr: 1 }}>
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
                      py: { xs: 0.6, md: 0.9 },
                      fontSize: { xs: 16, md: 21 },
                      lineHeight: 2,
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
          </Box>
        </Box>
      </Card>

      <Card sx={{ p: 2.5, borderRadius: 'var(--mm-radius-lg)' }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
          播放列表（{playlist.length}）
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <List sx={{ maxHeight: 240, overflowY: 'auto' }}>
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

      <AgentAnalysisDialog
        open={analysisOpen}
        title={`歌词情感分析 · ${current.name}`}
        loading={analysisLoading}
        result={analysisResult}
        error={analysisError}
        onClose={() => setAnalysisOpen(false)}
      />
    </Box>
  );
}
