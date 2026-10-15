'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Rating,
  Select,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { toast } from '@/lib/notify';
import { normalizePage } from '@/lib/page';
import {
  getMovieListService,
  searchMovieService,
  searchMovieByDirectorService,
  searchMovieByActorService,
  getAllCategoriesService,
  getMoviesByCategoryIdService,
  getVideoFavoriteListService,
  addVideoFavoriteService,
  cancelVideoFavoriteService,
} from '@/api/video';

interface MovieItem {
  id: number;
  name: string;
  directedBy?: string;
  actor?: string;
  type?: string;
  time?: number;
  rate?: number;
  pic?: string;
  cover?: string;
  abs?: string;
  showTime?: string;
}

const PAGE_SIZE = 12;

export default function VideoViewPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'director' | 'actor'>('title');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState('rating');
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const mapMovie = (raw: Record<string, unknown>): MovieItem => ({
    id: Number(raw.id),
    name: String(raw.name ?? '未命名'),
    directedBy: raw.directedBy as string,
    actor: raw.actor as string,
    type: raw.type as string,
    time: raw.time as number,
    rate: raw.rate as number,
    pic: (raw.pic as string) || (raw.picture as string) || (raw.cover as string) || undefined,
    abs: (raw.abs as string) || (raw.info as string),
    showTime: raw.showTime as string,
  });

  const load = useCallback(async () => {
    setLoading(true);
    let list: MovieItem[] = [];
    try {
      let res;
      if (categoryId) {
        res = await getMoviesByCategoryIdService(categoryId, page, PAGE_SIZE);
      } else if (keyword) {
        if (searchType === 'director') res = await searchMovieByDirectorService(keyword, page, PAGE_SIZE);
        else if (searchType === 'actor') res = await searchMovieByActorService(keyword, page, PAGE_SIZE);
        else res = await searchMovieService(keyword, page, PAGE_SIZE);
      } else {
        res = await getMovieListService(page, PAGE_SIZE);
      }
      const { rows, total: t } = normalizePage<Record<string, unknown>>(res);
      list = rows.map(mapMovie);
      setMovies(sortMovies(list, sortOrder));
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [categoryId, keyword, searchType, page, sortOrder]);

  /** 一次拉取收藏列表，避免逐个影片查询 */
  const loadFavorites = useCallback(async () => {
    try {
      const res = await getVideoFavoriteListService(1, 500);
      const { rows } = normalizePage<Record<string, unknown>>(res);
      setFavoriteIds(rows.map((r) => Number(r.id)).filter(Boolean));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    getAllCategoriesService()
      .then((res) => setCategories((res.data as unknown as Array<{ id: number; name: string }>) || []))
      .catch(() => undefined);
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFavorite = async (movie: MovieItem) => {
    if (favoriteIds.includes(movie.id)) {
      const res = await cancelVideoFavoriteService(movie.id);
      if (res.code === 200) {
        toast.success('已取消收藏');
        setFavoriteIds((ids) => ids.filter((i) => i !== movie.id));
      }
    } else {
      const res = await addVideoFavoriteService(movie.id);
      if (res.code === 200) {
        toast.success('收藏成功');
        setFavoriteIds((ids) => [...ids, movie.id]);
      }
    }
  };

  return (
    <Box>
      <PageHeader title="视频浏览" subtitle="开启影像之旅，在线观看与收藏" icon={<MovieRoundedIcon />} />

      <Card sx={{ p: 2.5, mb: 3, borderRadius: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={searchType}
            onChange={(_, v) => v && setSearchType(v)}
          >
            <ToggleButton value="title">片名</ToggleButton>
            <ToggleButton value="director">导演</ToggleButton>
            <ToggleButton value="actor">主演</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            fullWidth
            size="small"
            placeholder="搜索影片"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                load();
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>排序</InputLabel>
            <Select label="排序" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <MenuItem value="rating">按评分</MenuItem>
              <MenuItem value="year">按年份</MenuItem>
              <MenuItem value="title">按片名</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => {
              setPage(1);
              load();
            }}
          >
            搜索
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              setKeyword('');
              setCategoryId(null);
              setSortOrder('rating');
              setPage(1);
            }}
          >
            重置
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          <Chip
            label="全部"
            color={categoryId === null ? 'primary' : 'default'}
            onClick={() => {
              setCategoryId(null);
              setPage(1);
            }}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              color={categoryId === c.id ? 'primary' : 'default'}
              onClick={() => {
                setCategoryId(c.id);
                setKeyword('');
                setPage(1);
              }}
            />
          ))}
        </Stack>
      </Card>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 3 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} sx={{ borderRadius: 4 }}>
              <Skeleton variant="rectangular" height={240} />
              <CardContent>
                <Skeleton variant="text" />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : movies.length === 0 ? (
        <EmptyState icon={<MovieRoundedIcon sx={{ fontSize: 64 }} />} title="没有找到相关影片" description="换个关键词或分类试试吧" />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 3 }}>
          {movies.map((m) => (
            <Card
              key={m.id}
              className="mm-hover-lift"
              onClick={() => router.push(`/content/movie/play/${m.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/content/movie/play/${m.id}`);
                }
              }}
              sx={{ borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }}
            >
              <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={m.pic || '/cover.jpg'}
                    alt={m.name}
                    sx={{ width: '100%', height: 260, objectFit: 'cover', display: 'block', bgcolor: 'action.hover' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(0,0,0,.28)',
                      opacity: 0,
                      transition: 'opacity 200ms',
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <IconButton sx={{ bgcolor: 'rgba(255,255,255,.92)', '&:hover': { bgcolor: '#fff' }, width: 56, height: 56 }}>
                      <PlayArrowRoundedIcon fontSize="large" color="primary" />
                    </IconButton>
                  </Box>
                  {m.type && (
                    <Chip label={m.type} size="small" sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(0,0,0,.55)', color: '#fff' }} />
                  )}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(m);
                    }}
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: '#fff' } }}
                  >
                    {favoriteIds.includes(m.id) ? (
                      <StarRoundedIcon fontSize="small" sx={{ color: '#F59E0B' }} />
                    ) : (
                      <StarBorderRoundedIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {m.name}
                  </Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 140 }}>
                      {m.directedBy ? `导演：${m.directedBy}` : '未知导演'}
                    </Typography>
                    <Rating value={Number(m.rate) || 0} readOnly size="small" precision={0.1} />
                  </Stack>
                </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {total > 0 && (
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ mt: 4 }}>
          <Button variant="outlined" startIcon={<ChevronLeftRoundedIcon />} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            上一页
          </Button>
          <Typography variant="body2" color="text.secondary">
            第 {page} 页 / 共 {Math.max(1, Math.ceil(total / PAGE_SIZE))} 页 · {total} 部
          </Typography>
          <Button
            variant="outlined"
            endIcon={<ChevronRightRoundedIcon />}
            disabled={page >= Math.ceil(total / PAGE_SIZE)}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </Stack>
      )}
    </Box>
  );
}

function sortMovies(list: MovieItem[], order: string) {
  const copy = [...list];
  if (order === 'rating') copy.sort((a, b) => (b.rate || 0) - (a.rate || 0));
  else if (order === 'year')
    copy.sort((a, b) => {
      const da = a.showTime ? new Date(a.showTime).getTime() : 0;
      const db = b.showTime ? new Date(b.showTime).getTime() : 0;
      return db - da;
    });
  else copy.sort((a, b) => a.name.localeCompare(b.name));
  return copy;
}
