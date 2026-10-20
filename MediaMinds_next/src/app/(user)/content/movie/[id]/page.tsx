'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Rating,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { toast } from '@/lib/notify';
import { pushRecent, removeRecent } from '@/lib/recent';
import { areaLabel, languageLabel } from '@/lib/format';
import {
  getMovieByIdService,
  updateMovieService,
  deleteMovieService,
  updateMovieCoverService,
  updateMovieVideoService,
  updateWatchRecordService,
  getMovieWatchProvidersService,
  getVideoListsService,
  getVideoListMembershipService,
  addMovieToListService,
  type VideoList,
  type MovieWatchProviders,
} from '@/api/video';
import FormDialog, { type FormField } from '@/components/manage/FormDialog';
import { useCrud } from '@/components/manage/useCrud';
import AddToListDialog from '@/components/lists/AddToListDialog';
import type { MediaListSummary } from '@/components/lists/MediaListPanel';
import VideoLibraryRoundedIcon from '@mui/icons-material/VideoLibraryRounded';
import { MOVIE_FIELDS, movieFormInitial, toMoviePayload } from '@/lib/movieForm';
import type { Movie } from '@/types';

/** 编辑表单 = 影片字段 + 视频文件（媒体本体不入库，只存路径） */
const EDIT_FIELDS: FormField[] = [
  ...MOVIE_FIELDS,
  {
    name: 'videoFile',
    label: '视频文件',
    type: 'file',
    accept: 'video/*',
    helperText: '选填；上传后会覆盖原视频路径',
  },
];

/** 从 showTime 里取年份（兼容 "2021-03-05" / "2021" 这类值） */
function pickYear(showTime?: string) {
  if (!showTime) return '';
  const matched = String(showTime).match(/\d{4}/);
  return matched ? matched[0] : String(showTime);
}

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [videoLists, setVideoLists] = useState<VideoList[]>([]);
  const [inAnyList, setInAnyList] = useState(false);
  const [addToListOpen, setAddToListOpen] = useState(false);
  /** 没有本地视频时，展示 TMDB 登记的第三方播放平台 */
  const [watchSources, setWatchSources] = useState<MovieWatchProviders | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const loadMovie = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getMovieByIdService(id);
      if (res.code === 200 && res.data) setMovie(res.data as Movie);
      else setMovie(null);
    } catch {
      setMovie(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMovie();
  }, [loadMovie]);

  const movieCrud = useCrud({
    update: (v) => updateMovieService(v as Partial<Movie>),
    remove: (i) => deleteMovieService(i),
    label: '影片',
  });

  const loadListState = useCallback(async () => {
    if (!id) return;
    try {
      const [listsRes, membershipRes] = await Promise.all([
        getVideoListsService(),
        getVideoListMembershipService(),
      ]);
      setVideoLists((listsRes.data as VideoList[]) || []);
      setInAnyList(((membershipRes.data || {})[String(id)]?.length ?? 0) > 0);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    loadListState();
  }, [loadListState]);

  // 没有本地视频源时，向 TMDB 查询第三方播放平台；有本地视频则不打扰接口
  useEffect(() => {
    if (!id || !movie || movie.video) {
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
  }, [id, movie]);

  /** 没有本地视频时，点「播放」或打开第三方平台都算看过 */
  const markViewed = useCallback(() => {
    if (!movie || movie.video) return;
    pushRecent('video', {
      id: movie.id as number,
      title: movie.name || movie.movieName || '未命名',
      subtitle: movie.directedBy || movie.director,
      cover: movie.pic || movie.picture || movie.cover,
    });
    updateWatchRecordService(id, 0, 0).catch(() => undefined);
  }, [id, movie]);

  /** 「播放」始终可用：有本地视频直接播，没有则进入播放页看第三方播放源 */
  const handlePlay = () => {
    if (!movie) return;
    markViewed();
    router.push(`/content/movie/play/${id}`);
  };

  const uploadVideo = async (file?: File | null) => {
    if (!file || !movie) return;
    setUploadingVideo(true);
    try {
      await updateMovieVideoService(movie.id!, file);
      toast.success('视频已上传');
      await loadMovie();
    } catch {
      toast.error('视频上传失败');
    } finally {
      setUploadingVideo(false);
    }
  };

  const addToVideoList = async (listId: number) => {
    if (!id) return false;
    try {
      const res = await addMovieToListService(listId, id);
      if (res.code === 200) {
        toast.success('已加入播单');
        await loadListState();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const listSummaries = useMemo<MediaListSummary[]>(
    () =>
      videoLists
        .filter((list) => list.id != null)
        .map((list) => ({
          id: Number(list.id),
          name: list.name,
          description: list.description,
          count: Number(list.movieCount ?? 0),
        })),
    [videoLists],
  );

  const submitEdit = async (values: Record<string, unknown>, files: Record<string, File>) => {
    if (!movie) return;
    const movieId = Number(movie.id);

    const { ok } = await movieCrud.save(
      toMoviePayload(values, { id: movieId, source: movie.source ?? 'manual' }),
      true,
    );
    if (!ok) return;

    // 海报 / 视频单独上传：接口需要已有 id
    const poster = files.picture;
    if (poster) {
      try {
        await updateMovieCoverService(movieId, poster);
        toast.success('海报已更新');
      } catch {
        toast.error('海报上传失败');
      }
    }
    const videoFile = files.videoFile;
    if (videoFile) {
      try {
        await updateMovieVideoService(movieId, videoFile);
        toast.success('视频已更新');
      } catch {
        toast.error('视频上传失败');
      }
    }

    setFormOpen(false);
    loadMovie();
  };

  const removeMovie = async () => {
    if (!movie) return;
    const ok = await movieCrud.removeById(Number(movie.id), title);
    if (ok) {
      // 「最近观看」有本地快照，删除影片时一并清掉，避免列表残留已不存在的条目
      removeRecent('video', movie.id as number);
      router.push('/content/video');
    }
  };

  const title = movie?.name || movie?.movieName || '未命名';
  const director = movie?.directedBy || movie?.director;
  // 后端返回的封面字段是 picture（不是 pic），这里做完整兜底
  const cover = movie?.pic || movie?.picture || movie?.cover;
  const tagline = (movie?.abs as string) || '';
  const overview = (movie?.info as string) || (movie?.description as string) || tagline;
  const year = pickYear(movie?.showTime);
  const hasLocalVideo = Boolean(movie?.video);
  const genreList = (movie?.type || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 6);
  const castList = (movie?.actor || '')
    .split(/\s*\/\s*/)
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 3.5 }}>
        <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 'var(--mm-radius-lg)' }} />
        <Stack spacing={1.5}>
          <Skeleton variant="text" width={280} sx={{ fontSize: '2rem' }} />
          <Skeleton variant="text" width={200} />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </Stack>
      </Box>
    );
  }

  if (!movie) {
    return (
      <Box>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()} sx={{ mb: 2.5 }}>
          返回
        </Button>
        <EmptyState
          icon={<MovieRoundedIcon sx={{ fontSize: 64 }} />}
          title="没有找到这部影片"
          description="它可能已被移除，返回列表看看别的吧"
          action={
            <Button variant="contained" onClick={() => router.push('/content/video')}>
              返回视频浏览
            </Button>
          }
        />
      </Box>
    );
  }

  return (
    <Box>
      <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()} sx={{ mb: 2.5 }}>
        返回
      </Button>

      <Card sx={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--mm-radius-xl)' }}>
        {cover && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url("${cover}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.07,
              pointerEvents: 'none',
            }}
          />
        )}
        <CardContent
          sx={{ position: 'relative', p: { xs: 2.5, md: 3.5 }, '&:last-child': { pb: { xs: 2.5, md: 3.5 } } }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: { xs: 3, md: 3.5 } }}>
            {/* 海报 */}
            <Box
              sx={{
                borderRadius: 'var(--mm-radius-lg)',
                overflow: 'hidden',
                boxShadow: 'var(--mm-raised)',
                alignSelf: 'start',
              }}
            >
              <CoverImage
                src={cover}
                alt={title}
                sx={{
                  width: '100%',
                  aspectRatio: '2 / 3',
                  objectFit: 'cover',
                  display: 'block',
                  bgcolor: 'var(--mm-sunken)',
                }}
              />
            </Box>

            {/* 影片信息 */}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{ mb: 1.25, fontSize: { xs: '1.9rem', md: '2.5rem' }, lineHeight: 1.15 }}
              >
                {title}
              </Typography>

              {tagline && (
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontStyle: 'italic', color: 'text.secondary' }}>
                  {tagline}
                </Typography>
              )}

              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Rating value={Number(movie.rate) || 0} readOnly precision={0.1} />
                <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Number(movie.rate) ? Number(movie.rate).toFixed(1) : '暂无评分'}
                </Typography>
                {year && <Chip label={year} size="small" variant="outlined" />}
                {movie.time ? <Chip label={`${movie.time} 分钟`} size="small" variant="outlined" /> : null}
                {movie.source && <Chip label={movie.source} size="small" variant="outlined" />}
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                {director && <Chip label={`导演：${director}`} size="small" />}
                {areaLabel(movie.area) && <Chip label={areaLabel(movie.area)} size="small" variant="outlined" />}
                {languageLabel(movie.language) && (
                  <Chip label={languageLabel(movie.language)} size="small" variant="outlined" />
                )}
                {genreList.map((genre) => (
                  <Chip key={genre} label={genre} size="small" variant="outlined" />
                ))}
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowRoundedIcon />}
                  onClick={handlePlay}
                >
                  播放
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<UploadFileRoundedIcon />}
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                >
                  {uploadingVideo ? '上传中…' : '上传视频'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  color={inAnyList ? 'warning' : 'inherit'}
                  startIcon={inAnyList ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
                  onClick={() => setAddToListOpen(true)}
                >
                  加入播单
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<EditRoundedIcon />}
                  onClick={() => setFormOpen(true)}
                >
                  编辑
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  color="error"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  onClick={removeMovie}
                >
                  删除
                </Button>
              </Stack>

              <Box sx={{ mb: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="h6" fontWeight={700}>
                    播放源
                  </Typography>
                  {watchSources?.region && (
                    <Typography variant="caption" color="text.secondary">
                      TMDB · {watchSources.region}
                    </Typography>
                  )}
                </Stack>

                {hasLocalVideo ? (
                  <Chip label="本地视频" size="small" color="primary" variant="outlined" />
                ) : sourcesLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    正在从 TMDB 查询第三方播放平台…
                  </Typography>
                ) : watchSources?.providers?.length ? (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    {watchSources.providers.map((provider) => (
                      <Button
                        key={`${provider.type}-${provider.id}`}
                        size="small"
                        variant="outlined"
                        startIcon={
                          provider.logo ? (
                            <Box
                              component="img"
                              src={provider.logo}
                              alt=""
                              sx={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }}
                            />
                          ) : undefined
                        }
                        onClick={() => {
                          markViewed();
                          if (watchSources.link) {
                            window.open(watchSources.link, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        {provider.name}
                        <Typography component="span" variant="caption" sx={{ ml: 0.75, opacity: 0.7 }}>
                          {provider.typeLabel}
                        </Typography>
                      </Button>
                    ))}
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {watchSources?.note || '暂无本地视频源，TMDB 也没有返回该地区的播放平台。'}
                    </Typography>
                    {watchSources?.link && (
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<OpenInNewRoundedIcon />}
                        onClick={() => {
                          markViewed();
                          if (watchSources.link) {
                            window.open(watchSources.link, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        在 TMDB 查看
                      </Button>
                    )}
                  </Stack>
                )}
              </Box>

              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                简介
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {overview || '暂无简介'}
              </Typography>

              {castList.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1.25 }}>
                    演员阵容
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {castList.map((actor) => (
                      <Chip key={actor} label={actor} variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <input
        ref={videoInputRef}
        type="file"
        hidden
        accept="video/*"
        onChange={(e) => {
          void uploadVideo(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <AddToListDialog
        open={addToListOpen}
        title="加入播单"
        itemTitle={title}
        lists={listSummaries}
        unit="部"
        icon={<VideoLibraryRoundedIcon />}
        onAdd={addToVideoList}
        onClose={() => setAddToListOpen(false)}
        onCreate={() => {
          setAddToListOpen(false);
          router.push('/content/video');
        }}
      />

      {/* 编辑影片 */}
      <FormDialog
        open={formOpen}
        title="编辑影片"
        fields={EDIT_FIELDS}
        initial={movie ? movieFormInitial(movie as unknown as Record<string, unknown>) : undefined}
        submitting={movieCrud.saving}
        onClose={() => setFormOpen(false)}
        onSubmit={submitEdit}
      />
    </Box>
  );
}
