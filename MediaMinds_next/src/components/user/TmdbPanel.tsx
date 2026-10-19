'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { toast } from '@/lib/notify';
import {
  searchTmdbService,
  searchTmdbPersonService,
  getTmdbPersonMoviesService,
  importTmdbMovieService,
  addVideoFavoriteService,
  type TmdbDimension,
} from '@/api/video';

interface TmdbMovie {
  tmdbId: number;
  title: string;
  posterPath?: string;
  year?: string;
  voteAverage?: number;
}

interface TmdbPerson {
  id: number;
  name: string;
}

interface TmdbMeta {
  imageBase: string;
  posterSize: string;
}

/** TMDB 原始影片结果 → 卡片数据 */
function normalizeMovie(raw: Record<string, unknown>): TmdbMovie {
  const release = String(raw.release_date ?? raw.first_air_date ?? '');
  return {
    tmdbId: Number(raw.id ?? 0),
    title: String(raw.title ?? raw.name ?? '未命名'),
    posterPath: (raw.poster_path as string) || undefined,
    year: release.slice(0, 4) || undefined,
    voteAverage: Number(raw.vote_average ?? 0) || 0,
  };
}

/**
 * TMDB 在线结果面板（**受页面工具栏驱动**）。
 *
 * 关键词与维度都由外层传入——工具栏里的搜索框和筛选下拉就是它的输入，
 * 面板自己不再有搜索框，避免页面上出现两组搜索。
 *
 * - 片名：直接搜影片。
 * - 演员 / 导演：先搜人物、取第一个匹配，再按人物查其作品。
 */
export default function TmdbPanel({
  keyword,
  dimension,
  nonce,
  onImported,
}: {
  keyword: string;
  dimension: TmdbDimension;
  /** 每次点「搜索」自增，用于强制重搜同一个关键词 */
  nonce: number;
  /** 收藏入库后通知外层刷新本地列表 / 收藏 */
  onImported?: () => void;
}) {
  const { mm } = useTheme();

  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [meta, setMeta] = useState<TmdbMeta>({ imageBase: '', posterSize: '' });
  const [personName, setPersonName] = useState('');
  const [personId, setPersonId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  /** 搜索代号：关键词 / 维度变化时自增，用于丢弃在途的翻页响应 */
  const searchKeyRef = useRef(0);

  useEffect(() => {
    const kw = keyword.trim();
    searchKeyRef.current += 1;
    if (!kw) {
      setMovies([]);
      setPersonName('');
      setPersonId(0);
      setSearched(false);
      setPage(1);
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPage(1);
    setHasMore(false);
    setLoadingMore(false);
    (async () => {
      try {
        if (dimension === 'title') {
          const res = await searchTmdbService(kw, 1);
          if (cancelled) return;
          const data = res.data as unknown as {
            results?: Array<Record<string, unknown>>;
            imageBase?: string;
            posterSize?: string;
            totalPages?: number;
          };
          setMeta({ imageBase: data?.imageBase ?? '', posterSize: data?.posterSize ?? '' });
          setPersonName('');
          setPersonId(0);
          setMovies((data?.results ?? []).map(normalizeMovie));
          setHasMore((data?.totalPages ?? 1) > 1);
        } else {
          const personRes = await searchTmdbPersonService(kw, 1);
          if (cancelled) return;
          const personData = personRes.data as unknown as {
            results?: Array<Record<string, unknown>>;
            imageBase?: string;
            posterSize?: string;
          };
          const first = (personData?.results ?? [])[0];
          if (!first) {
            setMovies([]);
            setPersonName('');
            setPersonId(0);
            setSearched(true);
            return;
          }
          const person: TmdbPerson = { id: Number(first.id ?? 0), name: String(first.name ?? '') };

          const movieRes = await getTmdbPersonMoviesService(
            person.id,
            dimension === 'director' ? 'director' : 'actor',
            1,
          );
          if (cancelled) return;
          const movieData = movieRes.data as unknown as {
            results?: Array<Record<string, unknown>>;
            imageBase?: string;
            posterSize?: string;
            totalPages?: number;
          };
          setMeta({ imageBase: movieData?.imageBase ?? '', posterSize: movieData?.posterSize ?? '' });
          setPersonName(person.name);
          setPersonId(person.id);
          setMovies((movieData?.results ?? []).map(normalizeMovie));
          setHasMore((movieData?.totalPages ?? 1) > 1);
        }
        setSearched(true);
      } catch {
        if (!cancelled) {
          setMovies([]);
          setSearched(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keyword, dimension, nonce]);

  /** 拉取下一页并追加（滚动到底部触发）；用 page >= totalPages 判断没有更多 */
  const loadMore = useCallback(async () => {
    const kw = keyword.trim();
    if (!kw || loadingMore || !hasMore) return;
    const next = page + 1;
    const myKey = searchKeyRef.current;
    setLoadingMore(true);
    try {
      if (dimension === 'title') {
        const res = await searchTmdbService(kw, next);
        if (myKey !== searchKeyRef.current) return;
        const data = res.data as unknown as {
          results?: Array<Record<string, unknown>>;
          totalPages?: number;
        };
        setMovies((prev) => [...prev, ...(data?.results ?? []).map(normalizeMovie)]);
        setHasMore(next < (data?.totalPages ?? 1));
      } else {
        const movieRes = await getTmdbPersonMoviesService(
          personId,
          dimension === 'director' ? 'director' : 'actor',
          next,
        );
        if (myKey !== searchKeyRef.current) return;
        const movieData = movieRes.data as unknown as {
          results?: Array<Record<string, unknown>>;
          totalPages?: number;
        };
        setMovies((prev) => [...prev, ...(movieData?.results ?? []).map(normalizeMovie)]);
        setHasMore(next < (movieData?.totalPages ?? 1));
      }
      setPage(next);
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoadingMore(false);
    }
  }, [keyword, dimension, page, loadingMore, hasMore, personId]);

  // 列表底部哨兵进入视口 → 自动加载下一页
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '240px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  const posterUrl = useCallback(
    (path?: string) => (path ? `${meta.imageBase}${meta.posterSize}${path}` : ''),
    [meta],
  );

  const importMovie = async (movie: TmdbMovie) => {
    if (!movie.tmdbId) return;
    const res = await importTmdbMovieService(movie.tmdbId);
    if (res.code === 200) {
      // 收藏 = 入库：先写入影视库，再收藏；取消收藏不会把影片移出库
      const movieId = (res.data as unknown as { movie?: { id?: number } } | undefined)?.movie?.id;
      let favorited = false;
      if (movieId) {
        try {
          const fav = await addVideoFavoriteService(movieId);
          favorited = fav.code === 200;
        } catch {
          /* 已收藏或收藏失败都不影响入库 */
        }
      }
      toast.success(favorited ? '已收藏并加入影视库' : '已加入影视库');
      onImported?.();
    } else {
      toast.error((res as { message?: string }).message || '收藏失败');
    }
  };

  // ────────────────────────── 渲染 ──────────────────────────

  if (!keyword.trim()) {
    return (
      <EmptyState
        icon={<MovieRoundedIcon />}
        title="在线搜索"
        description="在上面的搜索框里输入关键词，可以用片名 / 演员 / 导演三种方式检索 TMDB。"
        minHeight={240}
      />
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(6,1fr)' },
          gap: 2.5,
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} sx={{ borderRadius: 'var(--mm-radius-lg)', overflow: 'hidden' }}>
            <Skeleton variant="rectangular" sx={{ aspectRatio: '2 / 3', borderRadius: 'var(--mm-radius-lg) var(--mm-radius-lg) 0 0' }} />
            <CardContent>
              <Skeleton variant="text" />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (!searched) return null;

  if (movies.length === 0) {
    if (dimension === 'title') {
      return <EmptyState icon={<MovieRoundedIcon />} title="没有找到相关影片" description="换个关键词试试" />;
    }
    return (
      <EmptyState
        icon={<PersonRoundedIcon />}
        title={`没有找到这位${dimension === 'director' ? '导演' : '演员'}`}
        description="换个关键词试试"
      />
    );
  }

  return (
    <Box>
      {dimension !== 'title' && personName ? (
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5 }}>
          {personName} 的作品
        </Typography>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(6,1fr)' },
          gap: 2.5,
        }}
      >
        {movies.map((movie, i) => (
          <Card key={`${movie.tmdbId}-${i}`} sx={{ borderRadius: 'var(--mm-radius-lg)', overflow: 'hidden' }}>
            <CoverImage
              src={posterUrl(movie.posterPath)}
              alt={movie.title}
              sx={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', display: 'block', bgcolor: 'var(--mm-sunken)' }}
            />
            <CardContent sx={{ px: 2.5, pt: 2.25, pb: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {movie.title}
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5, mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {movie.year || '未知年份'}
                </Typography>
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <StarRoundedIcon sx={{ fontSize: 16, color: mm.warning }} />
                  <Typography variant="caption" color="text.secondary">
                    {(movie.voteAverage ?? 0).toFixed(1)}
                  </Typography>
                </Stack>
              </Stack>
              <Button
                fullWidth
                size="small"
                variant="contained"
                startIcon={<StarBorderRoundedIcon />}
                onClick={() => importMovie(movie)}
              >
                收藏
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      {hasMore ? (
        <>
          <Box ref={sentinelRef} sx={{ height: 1 }} />
          {loadingMore ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              加载中…
            </Typography>
          ) : null}
        </>
      ) : (
        <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          没有更多了
        </Typography>
      )}
    </Box>
  );
}
