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
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import {
  getMovieByIdService,
  getMovieWatchProvidersService,
  updateWatchRecordService,
  type MovieWatchProviders,
} from '@/api/video';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { pushRecent } from '@/lib/recent';
import { areaLabel, languageLabel } from '@/lib/format';
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
  /** 新版本把观看进度存成 0-1 的比例，等元数据加载后再换算成秒定位 */
  const [resumeRatio, setResumeRatio] = useState(0);
  /** 没有本地视频源时，展示 TMDB 的第三方播放平台 */
  const [watchSources, setWatchSources] = useState<MovieWatchProviders | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const markedViewedRef = useRef(false);
  const src = movie?.videoUrl || (movie as { url?: string })?.url || movie?.video || '';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMovieByIdService(id)
      .then((res) => {
        if (res.code === 200 && res.data) {
          const m = res.data as Movie & { watchProgress?: number };
          setMovie(m);
          // 兼容历史数据：旧版本把「秒数」写进了 watchProgress，新版本写的是 0-1 的比例
          const stored = Number(m.watchProgress) || 0;
          if (stored > 1) setCurrent(stored);
          else if (stored > 0) setResumeRatio(stored);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 定期保存观看进度
  const saveRecord = () => {
    const video = videoRef.current;
    if (!video || !id) return;
    const position = Math.floor(video.currentTime);
    // watchProgress 的约定是 0-1 的比例（历史 bug：这里曾把秒数当成比例传上去，
    // 导致库里出现 watch_progress = 23.00 这种越界值）
    const ratio = video.duration > 0 ? Number((video.currentTime / video.duration).toFixed(2)) : 0;
    updateWatchRecordService(id, position, ratio).catch(() => undefined);
  };

  useEffect(() => {
    // 没有本地视频时不跑进度定时器（进入页面时已写一条「最近观看」）
    if (!src) return;
    const t = setInterval(saveRecord, 15000);
    return () => {
      clearInterval(t);
      saveRecord();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, src]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // 观影时长：只有真正在播放时才计时（暂停 / 切走标签页都不计）
  useActivityTracker('video', playing && Boolean(id));

  // 记入「最近观看」（本地记录，供视频页的「最近观看」使用）
  useEffect(() => {
    if (!playing || !id) return;
    pushRecent('video', {
      id,
      title: movie?.name || movie?.movieName || '未命名',
      subtitle: movie?.directedBy || movie?.director,
      cover: movie?.pic || movie?.picture || movie?.cover,
    });
  }, [playing, id, movie]);

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

  useEffect(() => {
    markedViewedRef.current = false;
  }, [id]);

  // 没有本地视频也算「看过」：点「播放 / 查看播放源」进入本页就写入最近记录
  useEffect(() => {
    if (!id || !movie || src || markedViewedRef.current) return;
    markedViewedRef.current = true;
    pushRecent('video', {
      id,
      title: movie.name || movie.movieName || '未命名',
      subtitle: movie.directedBy || movie.director,
      cover: movie.pic || movie.picture || movie.cover,
    });
    updateWatchRecordService(id, 0, 0).catch(() => undefined);
  }, [id, movie, src]);

  // 没有本地视频时向 TMDB 查询第三方播放平台；有本地视频就不发这个请求
  useEffect(() => {
    if (!id || !movie || src) {
      setWatchSources(null);
      return;
    }
    let cancelled = false;
    setWatchSources(null);
    setSourcesLoading(true);
    getMovieWatchProvidersService(id)
      .then((res) => {
        if (!cancelled && res.code === 200) setWatchSources(res.data);
      })
      .catch(() => {
        if (!cancelled) setWatchSources(null);
      })
      .finally(() => {
        if (!cancelled) setSourcesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, movie, src]);

  return (
    <Box>
      <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()} sx={{ mb: 2.5 }}>
        返回
      </Button>

      {/* 播放器：描边方块包裹视频，控制条作为浮层压在视频上 */}
      <Box
        ref={containerRef}
        sx={{
          // 没有本地视频时直接展示下方第三方播放源，不留下一个空的播放器
          display: src ? 'block' : 'none',
          position: 'relative',
          width: '100%',
          bgcolor: 'var(--mm-bg)',
          borderRadius: fullscreen ? 0 : 'var(--mm-radius-xl)',
          boxShadow: fullscreen ? 'none' : 'var(--mm-raised-lg)',
          overflow: 'hidden',
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          src={src}
          poster={movie?.pic || movie?.picture || movie?.cover}
          onClick={togglePlay}
          onPlay={() => {
            setPlaying(true);
            // 立即落一条观看记录：只靠 15 秒定时器的话，短暂观看后返回列表会漏记
            saveRecord();
          }}
          onPause={() => {
            setPlaying(false);
            saveRecord();
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            // 存的是比例，等拿到 duration 再换算成秒定位
            if (resumeRatio > 0 && e.currentTarget.duration > 0) {
              const target = resumeRatio * e.currentTarget.duration;
              e.currentTarget.currentTime = target;
              setCurrent(target);
              setResumeRatio(0);
            }
          }}
          onEnded={() => {
            setPlaying(false);
            saveRecord();
          }}
          sx={{
            width: '100%',
            aspectRatio: '16 / 9',
            display: 'block',
            cursor: 'pointer',
            bgcolor: 'var(--mm-sunken)',
          }}
        />

        {/* 控制条：压在视频上的浮层 */}
        <Box
          sx={{
            display: src ? 'block' : 'none',
            position: 'absolute',
            left: { xs: 10, md: 14 },
            right: { xs: 10, md: 14 },
            bottom: { xs: 10, md: 14 },
            px: 1.75,
            py: 0.75,
            borderRadius: 'var(--mm-radius-lg)',
            bgcolor: 'var(--mm-bg)',
            color: 'var(--mm-text)',
            boxShadow: 'var(--mm-float)',
          }}
        >
          <Stack direction="row" spacing={{ xs: 1, md: 1.5 }} alignItems="center">
            <IconButton onClick={togglePlay} aria-label={playing ? '暂停' : '播放'}>
              {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
            </IconButton>
            <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {fmt(current)}
            </Typography>
            <Slider
              size="small"
              value={current}
              max={duration || 100}
              onChange={(_, v) => {
                const val = v as number;
                setCurrent(val);
                if (videoRef.current) videoRef.current.currentTime = val;
              }}
              sx={{ flex: 1 }}
              aria-label="播放进度"
            />
            <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
              {fmt(duration)}
            </Typography>
            <IconButton onClick={() => setMuted((m) => !m)} aria-label="静音">
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
              sx={{ width: 90, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
              aria-label="音量"
            />
            <IconButton onClick={toggleFullscreen} aria-label="全屏">
              {fullscreen ? <FullscreenExitRoundedIcon /> : <FullscreenRoundedIcon />}
            </IconButton>
          </Stack>
        </Box>

        {!src && !loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--mm-text-2)',
              pointerEvents: 'none',
            }}
          >
            <Stack alignItems="center" spacing={1}>
              <PlayArrowRoundedIcon sx={{ fontSize: 64 }} />
              <Typography>该影片没有本地视频源</Typography>
              <Typography variant="caption" color="text.secondary">
                可在下方选择第三方播放平台
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>

      {/* 没有本地视频时，展示 TMDB 的第三方播放平台 */}
      {!src && !loading && (
        <Card sx={{ mt: 3, borderRadius: 'var(--mm-radius-xl)' }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, '&:last-child': { pb: { xs: 2.5, md: 3.5 } } }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
              <Typography variant="h6" fontWeight={700}>
                第三方播放源
              </Typography>
              {watchSources?.region && (
                <Typography variant="caption" color="text.secondary">
                  TMDB · {watchSources.region}
                </Typography>
              )}
            </Stack>

            {sourcesLoading ? (
              <Typography variant="body2" color="text.secondary">
                正在从 TMDB 查询播放平台…
              </Typography>
            ) : watchSources?.providers?.length ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  该影片没有本地视频，以下平台信息来自 TMDB。
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  {watchSources.providers.map((provider) => (
                    <Button
                      key={`${provider.type}-${provider.id}`}
                      variant="outlined"
                      startIcon={
                        provider.logo ? (
                          <Box
                            component="img"
                            src={provider.logo}
                            alt=""
                            sx={{ width: 22, height: 22, objectFit: 'contain', display: 'block' }}
                          />
                        ) : undefined
                      }
                      onClick={() =>
                        watchSources.link &&
                        window.open(watchSources.link, '_blank', 'noopener,noreferrer')
                      }
                    >
                      {provider.name}
                      <Typography component="span" variant="caption" sx={{ ml: 0.75, opacity: 0.7 }}>
                        {provider.typeLabel}
                      </Typography>
                    </Button>
                  ))}
                </Stack>
                {watchSources.link && (
                  <Button
                    size="small"
                    variant="outlined"
                    endIcon={<OpenInNewRoundedIcon />}
                    sx={{ mt: 2 }}
                    onClick={() =>
                      watchSources.link &&
                      window.open(watchSources.link, '_blank', 'noopener,noreferrer')
                    }
                  >
                    在 TMDB 查看全部播放源
                  </Button>
                )}
              </>
            ) : (
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {watchSources?.note || 'TMDB 暂未返回该影片的第三方播放平台。'}
                </Typography>
                {watchSources?.link && (
                  <Button
                    size="small"
                    variant="outlined"
                    endIcon={<OpenInNewRoundedIcon />}
                    onClick={() =>
                      watchSources.link &&
                      window.open(watchSources.link, '_blank', 'noopener,noreferrer')
                    }
                  >
                    在 TMDB 查看
                  </Button>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* 影片信息 */}
      <Card sx={{ mt: 3, borderRadius: 'var(--mm-radius-xl)' }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, '&:last-child': { pb: { xs: 2.5, md: 3.5 } } }}>
          {loading ? (
            <Stack spacing={1}>
              <Skeleton variant="text" width={240} sx={{ fontSize: '1.6rem' }} />
              <Skeleton variant="text" width={320} />
            </Stack>
          ) : (
            <>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                <Typography variant="h5" fontWeight={700}>
                  {movie?.name}
                </Typography>
                <Rating value={Number(movie?.rate) || 0} readOnly precision={0.1} />
                {movie?.time && <Chip label={`${movie.time} 分钟`} size="small" />}
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {movie?.directedBy && <Chip label={`导演：${movie.directedBy}`} variant="outlined" size="small" />}
                {movie?.actor && <Chip label={`主演：${movie.actor}`} variant="outlined" size="small" />}
                {areaLabel(movie?.area) && <Chip label={areaLabel(movie?.area)} variant="outlined" size="small" />}
                {languageLabel(movie?.language) && (
                  <Chip label={languageLabel(movie?.language)} variant="outlined" size="small" />
                )}
                {movie?.showTime && <Chip label={String(movie.showTime)} variant="outlined" size="small" />}
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {(movie?.abs as string) || (movie?.info as string) || '暂无简介'}
              </Typography>

              {/* 播放进度说明：灰底提示条 */}
              <Box
                sx={{
                  mt: 2.5,
                  p: 1.75,
                  borderRadius: 'var(--mm-radius)',
                  bgcolor: 'var(--mm-sunken)',
                  boxShadow: 'var(--mm-sunken-sm)',
                }}
              >
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
