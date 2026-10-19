'use client';

import { useCallback, useEffect, useState } from 'react';
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
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { toast } from '@/lib/notify';
import { areaLabel, languageLabel } from '@/lib/format';
import {
  getMovieByIdService,
  isVideoFavoriteService,
  addVideoFavoriteService,
  cancelVideoFavoriteService,
  updateMovieService,
  deleteMovieService,
  updateMovieCoverService,
  updateMovieVideoService,
} from '@/api/video';
import FormDialog, { type FormField } from '@/components/manage/FormDialog';
import { useCrud } from '@/components/manage/useCrud';
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

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

  useEffect(() => {
    if (!id) return;
    isVideoFavoriteService(id)
      .then((res) => setIsFavorite(Boolean(res.data)))
      .catch(() => undefined);
  }, [id]);

  const toggleFavorite = async () => {
    if (!id) return;
    if (isFavorite) {
      const res = await cancelVideoFavoriteService(id);
      if (res.code === 200) {
        toast.success('已取消收藏');
        setIsFavorite(false);
      }
    } else {
      const res = await addVideoFavoriteService(id);
      if (res.code === 200) {
        toast.success('收藏成功');
        setIsFavorite(true);
      }
    }
  };

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
    if (ok) router.push('/content/video');
  };

  const title = movie?.name || movie?.movieName || '未命名';
  const director = movie?.directedBy || movie?.director;
  const actors = movie?.actor || movie?.actors;
  // 后端返回的封面字段是 picture（不是 pic），这里做完整兜底
  const cover = movie?.pic || movie?.picture || movie?.cover;
  const summary = (movie?.abs as string) || (movie?.info as string) || movie?.description;
  const year = pickYear(movie?.showTime);

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

      <Card sx={{ borderRadius: 'var(--mm-radius-xl)' }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, '&:last-child': { pb: { xs: 2.5, md: 3.5 } } }}>
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
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5 }}>
                {title}
              </Typography>

              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Rating value={Number(movie.rate) || 0} readOnly precision={0.1} />
                <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Number(movie.rate) ? Number(movie.rate).toFixed(1) : '暂无评分'}
                </Typography>
                {year && <Chip label={year} size="small" variant="outlined" />}
                {movie.time ? <Chip label={`${movie.time} 分钟`} size="small" variant="outlined" /> : null}
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
                {director && <Chip label={`导演：${director}`} size="small" />}
                {actors && <Chip label={`主演：${actors}`} size="small" />}
                {areaLabel(movie.area) && <Chip label={areaLabel(movie.area)} size="small" variant="outlined" />}
                {languageLabel(movie.language) && (
                  <Chip label={languageLabel(movie.language)} size="small" variant="outlined" />
                )}
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowRoundedIcon />}
                  onClick={() => router.push(`/content/movie/play/${id}`)}
                >
                  播放
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  color={isFavorite ? 'warning' : 'inherit'}
                  startIcon={isFavorite ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
                  onClick={toggleFavorite}
                >
                  {isFavorite ? '取消收藏' : '收藏'}
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

              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                简介
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {summary || '暂无简介'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

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
