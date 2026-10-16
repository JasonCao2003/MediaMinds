'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  useTheme,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { getRecent, relativeTime, type RecentItem } from '@/lib/recent';
import { toast } from '@/lib/notify';
import { normalizePage } from '@/lib/page';
import {
  getMovieListService,
  searchMovieService,
  getAllCategoriesService,
  getMoviesByCategoryIdService,
  getVideoFavoriteListService,
  addVideoFavoriteService,
  cancelVideoFavoriteService,
} from '@/api/video';

type VideoView = 'recent' | 'all' | 'favorite';
type RecentMode = 'added' | 'watched';

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

/** 「最近添加」一眼看完，不分页 */
const RECENT_SIZE = 24;

export default function VideoViewPage() {
  const router = useRouter();
  const { mm } = useTheme();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [favorites, setFavorites] = useState<MovieItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState('rating');
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [view, setView] = useState<VideoView>('recent');
  const [recentMode, setRecentMode] = useState<RecentMode>('added');
  const [recentAdded, setRecentAdded] = useState<MovieItem[]>([]);
  const [recentWatched, setRecentWatched] = useState<RecentItem[]>([]);

  const mapMovie = useCallback(
    (raw: Record<string, unknown>): MovieItem => ({
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
    }),
    [],
  );

  const loadMovies = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (categoryId) {
        res = await getMoviesByCategoryIdService(categoryId, page, PAGE_SIZE);
      } else if (keyword) {
        // 后端模糊搜索同时覆盖片名 / 导演 / 主演，不再需要用户选维度
        res = await searchMovieService(keyword, page, PAGE_SIZE);
      } else {
        res = await getMovieListService(page, PAGE_SIZE);
      }
      const { rows, total: t } = normalizePage<Record<string, unknown>>(res);
      setMovies(sortMovies(rows.map(mapMovie), sortOrder));
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [categoryId, keyword, page, sortOrder, mapMovie]);

  /** 最近添加：直接复用 /list（后端已按 create_time 倒序），只取一页，不再手动排序 */
  const loadRecentAdded = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMovieListService(1, RECENT_SIZE);
      const { rows } = normalizePage<Record<string, unknown>>(res);
      setRecentAdded(rows.map(mapMovie));
    } finally {
      setLoading(false);
    }
  }, [mapMovie]);

  const loadFavoriteMovies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVideoFavoriteListService(page, PAGE_SIZE);
      const { rows, total: t } = normalizePage<Record<string, unknown>>(res);
      setFavorites(sortMovies(rows.map(mapMovie), sortOrder));
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [page, sortOrder, mapMovie]);

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
    if (view === 'favorite') {
      loadFavoriteMovies();
      return;
    }
    if (view === 'recent') {
      if (recentMode === 'added') {
        loadRecentAdded();
      } else {
        // 最近观看走本地记录，不需要请求后端
        setRecentWatched(getRecent('video'));
      }
      return;
    }
    loadMovies();
  }, [view, recentMode, loadMovies, loadRecentAdded, loadFavoriteMovies]);

  const display = useMemo<MovieItem[]>(() => {
    if (view === 'favorite') return favorites;

    if (view === 'recent' && recentMode === 'watched') {
      // 本地记录只有卡片快照，把「最近时间」放进描述字段展示
      return recentWatched.map((r) => ({
        id: Number(r.id),
        name: r.title,
        directedBy: r.subtitle,
        pic: r.cover,
        abs: relativeTime(r.at),
      }));
    }

    return view === 'recent' ? recentAdded : movies;
  }, [view, recentMode, movies, recentAdded, favorites, recentWatched]);

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

  const titleText = (() => {
    if (view === 'recent') return recentMode === 'added' ? '最近添加' : '最近观看';
    if (view === 'favorite') return '我的收藏';
    if (keyword) return `“${keyword}” 的搜索结果`;
    return '全部影片';
  })();

  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 3.5, borderRadius: 'var(--mm-radius-lg)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="输入片名、导演或主演"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                loadMovies();
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
          {/* 排序与「最近」的时间序会打架，最近视图下隐藏 */}
          {view !== 'recent' && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              {/* 不显示「排序」浮动标签，框内直接显示当前排序方式 */}
              <Select
                displayEmpty
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                renderValue={(v) =>
                  ({ rating: '按评分', year: '按年份', title: '按片名' })[v as string] ?? '排序'
                }
                inputProps={{ 'aria-label': '排序方式' }}
              >
                <MenuItem value="rating">按评分</MenuItem>
                <MenuItem value="year">按年份</MenuItem>
                <MenuItem value="title">按片名</MenuItem>
              </Select>
            </FormControl>
          )}
          <ToggleButtonGroup
            exclusive
            value={view}
            onChange={(_, v) => {
              if (v) {
                setView(v);
                setPage(1);
              }
            }}
            size="small"
          >
            <ToggleButton value="recent">最近</ToggleButton>
            <ToggleButton value="all">全部</ToggleButton>
            <ToggleButton value="favorite">收藏</ToggleButton>
          </ToggleButtonGroup>
          {/* 「最近」的两种口径 */}
          {view === 'recent' && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={recentMode}
              onChange={(_, v) => v && setRecentMode(v as RecentMode)}
            >
              <ToggleButton value="added">最近添加</ToggleButton>
              <ToggleButton value="watched">最近观看</ToggleButton>
            </ToggleButtonGroup>
          )}
          <Button
            variant="contained"
            onClick={() => {
              // 搜索是「翻库」动作，切到全部视图展示结果
              setPage(1);
              setView('all');
              if (!keyword) loadMovies();
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

      <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5 }}>
        {titleText}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 3 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} sx={{ borderRadius: 'var(--mm-radius-lg)', overflow: 'hidden' }}>
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 'var(--mm-radius-lg) var(--mm-radius-lg) 0 0' }} />
              <CardContent>
                <Skeleton variant="text" />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : display.length === 0 ? (
        <EmptyState
          icon={<MovieRoundedIcon sx={{ fontSize: 64 }} />}
          title={view === 'favorite' ? '暂无收藏影片' : '没有找到相关影片'}
          description="换个关键词或分类试试吧"
        />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 3 }}>
          {display.map((m) => (
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
              sx={{ borderRadius: 'var(--mm-radius-lg)', overflow: 'hidden', cursor: 'pointer' }}
            >
              <Box sx={{ position: 'relative' }}>
                <CoverImage
                  src={m.pic}
                  alt={m.name}
                  sx={{ width: '100%', height: 260, objectFit: 'cover', display: 'block', bgcolor: 'var(--mm-sunken)' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    opacity: 0,
                    '&:hover, &:focus-within': { opacity: 1 },
                  }}
                >
                  <Tooltip title="立即播放">
                    <IconButton
                      aria-label="立即播放"
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'var(--mm-bg)',
                        color: 'var(--mm-accent-text)',
                        boxShadow: 'var(--mm-float)',
                        '&:hover': { bgcolor: 'var(--mm-bg)', color: 'var(--mm-accent-text)' },
                      }}
                    >
                      <PlayArrowRoundedIcon fontSize="large" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {m.type && (
                  <Chip
                    label={m.type}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      bgcolor: 'var(--mm-bg)',
                      color: 'var(--mm-text)',
                      boxShadow: 'var(--mm-float)',
                    }}
                  />
                )}
                <Tooltip title={favoriteIds.includes(m.id) ? '取消收藏' : '收藏'}>
                  <IconButton
                    size="small"
                    aria-label={favoriteIds.includes(m.id) ? '取消收藏' : '收藏'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(m);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      bgcolor: 'var(--mm-bg)',
                      color: favoriteIds.includes(m.id) ? mm.warning : 'var(--mm-text)',
                      boxShadow: 'var(--mm-float)',
                      '&:hover': { bgcolor: 'var(--mm-bg)' },
                    }}
                  >
                    {favoriteIds.includes(m.id) ? (
                      <StarRoundedIcon fontSize="small" />
                    ) : (
                      <StarBorderRoundedIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
              <CardContent sx={{ px: 2.5, pt: 2.25, pb: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {m.name}
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 140 }}>
                    {m.directedBy ? `导演：${m.directedBy}` : '未知导演'}
                  </Typography>
                  <Rating value={Number(m.rate) || 0} readOnly size="small" precision={0.1} sx={{ color: mm.warning }} />
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 34, mt: 0.5 }}
                >
                  {m.abs || '暂无简介'}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {total > 0 && view !== 'recent' && (
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
