'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Rating,
  Skeleton,
  Slider,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import { getMovieByIdService, updateWatchRecordService } from '@/api/video';
import type { Movie } from '@/types';

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MoviePlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const id = params?.id as string;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [movie, setMovie] = useState<Movie & { videoUrl?: string; pic?: string; watchProgress?: number }>();
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMovieByIdService(id)
      .then((res) => {
        if (res.code === 200 && res.data) {
          const m = res.data as Movie & { watchProgress?: number };
          setMovie(m);
          if (m.watchProgress) setCurrent(Number(m.watchProgress));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 定期保存观看进度
  const saveRecord = () => {
    const video = videoRef.current;
    if (!video || !id) return;
    updateWatchRecordService(id, Math.floor(video.currentTime), Math.floor(video.currentTime)).catch(() => undefined);
  };

  useEffect(() => {
    const t = setInterval(saveRecord, 15000);
    return () => {
      clearInterval(t);
      saveRecord();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const src = movie?.videoUrl || (movie as { url?: string })?.url || '';

  return (
    <Box>
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>
        返回
      </Button>

      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          width: '100%',
          bgcolor: '#000',
          borderRadius: fullscreen ? 0 : 4,
          overflow: 'hidden',
          boxShadow: 4,
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          src={src}
          poster={((movie?.pic || (movie as { picture?: string })?.picture || movie?.cover) as string)}
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
          sx={{ width: '100%', aspectRatio: '16 / 9', display: 'block', cursor: 'pointer', bgcolor: '#000' }}
        />

        {/* 控制栏 */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            px: 2,
            py: 1.5,
            background: 'linear-gradient(to top, rgba(0,0,0,.75), transparent)',
            color: '#fff',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton onClick={togglePlay} sx={{ color: '#fff' }} aria-label={playing ? '暂停' : '播放'}>
              {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
            </IconButton>
            <Typography variant="caption">{fmt(current)}</Typography>
            <Slider
              size="small"
              value={current}
              max={duration || 100}
              onChange={(_, v) => {
                const val = v as number;
                setCurrent(val);
                if (videoRef.current) videoRef.current.currentTime = val;
              }}
              sx={{ flex: 1, color: '#fff' }}
              aria-label="播放进度"
            />
            <Typography variant="caption">{fmt(duration)}</Typography>
            <IconButton onClick={() => setMuted((m) => !m)} sx={{ color: '#fff' }} aria-label="静音">
              {muted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
            </IconButton>
            <Slider
              size="small"
              value={muted ? 0 : volume * 100}
              onChange={(_, v) => {
                const val = (v as number) / 100;
                setMuted(false);
                setVolume(val);
                if (videoRef.current) videoRef.current.volume = val;
              }}
              sx={{ width: 90, color: '#fff' }}
              aria-label="音量"
            />
            <IconButton onClick={toggleFullscreen} sx={{ color: '#fff' }} aria-label="全屏">
              {fullscreen ? <FullscreenExitRoundedIcon /> : <FullscreenRoundedIcon />}
            </IconButton>
          </Stack>
        </Box>

        {!src && !loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.7)' }}>
            <Stack alignItems="center" spacing={1}>
              <PlayArrowRoundedIcon sx={{ fontSize: 64 }} />
              <Typography>该影片暂无可播放的视频源</Typography>
            </Stack>
          </Box>
        )}
      </Box>

      <Card sx={{ mt: 3, borderRadius: 4 }}>
        <CardContent>
          {loading ? (
            <Stack spacing={1}>
              <Skeleton variant="text" width={240} sx={{ fontSize: '1.6rem' }} />
              <Skeleton variant="text" width={320} />
            </Stack>
          ) : (
            <>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="h5" fontWeight={700}>
                  {movie?.name}
                </Typography>
                <Rating value={Number(movie?.rate) || 0} readOnly precision={0.1} />
                {movie?.time && <Chip label={`${movie.time} 分钟`} size="small" />}
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {movie?.directedBy && <Chip label={`导演：${movie.directedBy}`} variant="outlined" size="small" />}
                {movie?.actor && <Chip label={`主演：${movie.actor}`} variant="outlined" size="small" />}
                {movie?.area && <Chip label={String(movie.area)} variant="outlined" size="small" />}
                {movie?.showTime && <Chip label={String(movie.showTime)} variant="outlined" size="small" />}
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {(movie?.abs as string) || (movie?.info as string) || '暂无简介'}
              </Typography>
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: theme.palette.action.hover }}>
                <Typography variant="caption" color="text.secondary">
                  播放进度会自动记忆（每 15 秒保存一次），下次观看将从断点继续。
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
