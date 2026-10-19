'use client';

import { Children, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
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
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import TmdbPanel from '@/components/user/TmdbPanel';
import { toast } from '@/lib/notify';
import { normalizePage } from '@/lib/page';
import {
  getMovieListService,
  searchMovieService,
  getAllCategoriesService,
  getMoviesByCategoryIdService,
  getVideoFavoriteListService,
  getWatchHistoryService,
  addVideoFavoriteService,
  cancelVideoFavoriteService,
  addMovieService,
  updateMovieService,
  deleteMovieService,
  updateMovieCoverService,
  addCategoryService,
  updateCategoryService,
  getAllTagsService,
  addTagService,
  updateTagService,
  type TmdbDimension,
} from '@/api/video';
import type { Movie } from '@/types';
import { MOVIE_FIELDS, toMoviePayload } from '@/lib/movieForm';
import FormDialog, { type FormField } from '@/components/manage/FormDialog';
import DimensionDialog, { type DimensionItem } from '@/components/manage/DimensionDialog';
import { useCrud } from '@/components/manage/useCrud';

type VideoView = 'recent' | 'all' | 'favorite' | 'online';

const DIMENSION_LABEL: Record<TmdbDimension, string> = {
  title: '片名',
  actor: '演员',
  director: '导演',
};

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

/** 库的排序选项（字段 + 方向） */
type VideoSortKey = 'createTime-desc' | 'createTime-asc' | 'rate-desc' | 'showTime-desc' | 'name-asc';

const SORT_OPTIONS: { value: VideoSortKey; label: string }[] = [
  { value: 'createTime-desc', label: '最近添加' },
  { value: 'createTime-asc', label: '最早添加' },
  { value: 'rate-desc', label: '评分从高到低' },
  { value: 'showTime-desc', label: '上映时间从新到旧' },
  { value: 'name-asc', label: '片名 A → Z' },
];

/** 「最近添加」「最近观看」各取 3 个（一行三个），不分页 */
const RECENT_SIZE = 3;

const CATEGORY_FIELDS: FormField[] = [
  { name: 'name', label: '分类名', required: true, maxLength: 50 },
  { name: 'description', label: '描述', maxLength: 255 },
  { name: 'sortOrder', label: '排序', type: 'number', helperText: '数字越小越靠前' },
];

const TAG_FIELDS: FormField[] = [
  { name: 'name', label: '标签名', required: true, maxLength: 50 },
  { name: 'description', label: '描述', maxLength: 255 },
];

export default function VideoViewPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [favorites, setFavorites] = useState<MovieItem[]>([]);
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [tags, setTags] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [view, setView] = useState<VideoView>('recent');
  /** 库的排序：默认按添加顺序（最新在最上） */
  const [sortKey, setSortKey] = useState<VideoSortKey>('createTime-desc');
  const [recentAdded, setRecentAdded] = useState<MovieItem[]>([]);
  /** 「最近观看」直接来自服务端的观看历史（user_video_interaction），封面等字段都是全的 */
  const [watchedMovies, setWatchedMovies] = useState<MovieItem[]>([]);
  /** 在线搜索维度：片名 / 演员 / 导演 */
  const [onlineDimension, setOnlineDimension] = useState<TmdbDimension>('title');
  /** 每次点「搜索」自增，让面板强制重搜同一个关键词 */
  const [searchNonce, setSearchNonce] = useState(0);

  // 管理相关弹窗
  const [movieFormOpen, setMovieFormOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);

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
      const [sortField, sortOrder] = sortKey.split('-');
      const sort = { sortField, sortOrder };
      let res;
      if (categoryId) {
        res = await getMoviesByCategoryIdService(categoryId, page, PAGE_SIZE, sort);
      } else if (keyword) {
        // 后端模糊搜索同时覆盖片名 / 导演 / 主演，不再需要用户选维度
        res = await searchMovieService(keyword, page, PAGE_SIZE, sort);
      } else {
        res = await getMovieListService(page, PAGE_SIZE, sort);
      }
      const { rows, total: t } = normalizePage<Record<string, unknown>>(res);
      setMovies(rows.map(mapMovie));
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [categoryId, keyword, page, mapMovie, sortKey]);

  /**
   * 搜索：切到「全部」视图展示结果。
   * page 若发生变化，effect 会重新加载；若本来就是第 1 页，则手动补一次。
   * 在线视图交给 TMDB 面板，nonce 自增强制重搜。
   */
  const handleSearch = () => {
    if (view === 'online') {
      setSearchNonce((n) => n + 1);
      return;
    }
    setView('all');
    setPage(1);
    if (page === 1) loadMovies();
  };

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

  /** 观看历史：后端已按 last_watch_time 倒序，取前 RECENT_SIZE 条 */
  const loadWatchHistory = useCallback(async () => {
    try {
      const res = (await getWatchHistoryService(1, RECENT_SIZE)) as {
        data?: { records?: Record<string, unknown>[] };
      };
      setWatchedMovies((res?.data?.records ?? []).map(mapMovie));
    } catch {
      setWatchedMovies([]);
    }
  }, [mapMovie]);


  const loadFavoriteMovies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVideoFavoriteListService(page, PAGE_SIZE);
      const { rows, total: t } = normalizePage<Record<string, unknown>>(res);
      setFavorites(rows.map(mapMovie));
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [page, mapMovie]);

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

  const reloadCategories = useCallback(async () => {
    try {
      const res = await getAllCategoriesService();
      setCategories((res.data as unknown as Record<string, unknown>[]) || []);
    } catch {
      /* ignore */
    }
  }, []);

  const reloadTags = useCallback(async () => {
    try {
      const res = (await getAllTagsService()) as { data?: Record<string, unknown>[] };
      setTags(res?.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  /** 保存后刷新当前视图的列表 */
  const reloadList = useCallback(() => {
    if (view === 'recent') {
      loadWatchHistory();
    } else if (view === 'favorite') loadFavoriteMovies();
    else if (view === 'all') loadMovies();
  }, [view, loadMovies, loadRecentAdded, loadFavoriteMovies, loadWatchHistory]);

  const movieCrud = useCrud({
    create: (v) => addMovieService(v as Partial<Movie>),
    update: (v) => updateMovieService(v as Partial<Movie>),
    remove: (id) => deleteMovieService(id),
    onChanged: reloadList,
    label: '影片',
  });

  // 分类 / 标签只支持新建 / 编辑：它们被影片引用，删除会产生悬空引用
  const categoryCrud = useCrud({
    create: (v) => addCategoryService(v),
    update: (v) => updateCategoryService(v),
    onChanged: reloadCategories,
    label: '分类',
  });

  const tagCrud = useCrud({
    create: (v) => addTagService(v),
    update: (v) => updateTagService(v),
    onChanged: reloadTags,
    label: '标签',
  });

  useEffect(() => {
    reloadCategories();
    reloadTags();
    loadFavorites();
  }, [reloadCategories, reloadTags, loadFavorites]);

  useEffect(() => {
    if (view === 'favorite') {
      loadFavoriteMovies();
      return;
    }
    if (view === 'recent') {
      // 「最近」只看最近观看
      loadWatchHistory();
      return;
    }
    if (view === 'online') {
      // 在线视图由 TMDB 面板自行拉取，不触碰本地列表
      return;
    }
    loadMovies();
  }, [view, loadMovies, loadRecentAdded, loadFavoriteMovies, loadWatchHistory]);

  /** 「最近观看」的本地快照 → 卡片数据（把最近时间放进描述字段展示） */
  /** 普通网格（全部 / 收藏）的数据 */
  const display = useMemo<MovieItem[]>(
    () => (view === 'favorite' ? favorites : movies),
    [view, movies, favorites],
  );

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

  /** 分类 / 标签管理弹窗的列表数据 */
  const categoryItems: DimensionItem[] = useMemo(
    () =>
      categories
        .filter((c) => c.id != null)
        .map((c) => ({
          id: Number(c.id),
          label: String(c.name ?? '未命名'),
          caption: c.description ? String(c.description) : undefined,
          raw: {
            name: String(c.name ?? ''),
            description: c.description ? String(c.description) : '',
            sortOrder: c.sortOrder ?? '',
          },
        })),
    [categories],
  );

  const tagItems: DimensionItem[] = useMemo(
    () =>
      tags
        .filter((t) => t.id != null)
        .map((t) => ({
          id: Number(t.id),
          label: String(t.name ?? '未命名'),
          caption: t.description ? String(t.description) : undefined,
          raw: { name: String(t.name ?? ''), description: t.description ? String(t.description) : '' },
        })),
    [tags],
  );

  // ============================================================
  // 管理：影片（新建在本页；编辑 / 删除在详情页）
  // ============================================================

  const submitMovie = async (values: Record<string, unknown>, files: Record<string, File>) => {
    const { ok, data } = await movieCrud.save(toMoviePayload(values), false);
    if (!ok) return;

    // 海报单独上传：接口需要已有 id，用后端回传的实体 id
    const poster = files.picture;
    if (poster) {
      const createdId = (data as { id?: number } | undefined)?.id;
      if (createdId) {
        try {
          await updateMovieCoverService(createdId, poster);
          toast.success('海报上传成功');
          reloadList();
        } catch {
          toast.error('海报上传失败，可在详情页重试');
        }
      } else {
        toast.warning('未拿到新影片 id，海报未上传');
      }
    }

    setMovieFormOpen(false);
  };

  // ============================================================
  // 管理：分类 / 标签
  // ============================================================

  const submitCategory = async (values: Record<string, unknown>, editingId: string | number | null) => {
    const payload: Record<string, unknown> = { ...values };
    if (payload.sortOrder === '' || payload.sortOrder == null) delete payload.sortOrder;
    else payload.sortOrder = Number(payload.sortOrder);
    if (editingId != null) payload.id = editingId;
    const { ok } = await categoryCrud.save(payload, editingId != null);
    return ok;
  };

  const submitTag = async (values: Record<string, unknown>, editingId: string | number | null) => {
    const payload: Record<string, unknown> = editingId == null ? { ...values } : { ...values, id: editingId };
    const { ok } = await tagCrud.save(payload, editingId != null);
    return ok;
  };

  const titleText = (() => {
    if (view === 'recent' || view === 'online') return '';
    if (view === 'favorite') return '我的收藏';
    if (keyword) return `“${keyword}” 的搜索结果`;
    return '我的影视库';
  })();

  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 3.5, borderRadius: 'var(--mm-radius-lg)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={view === 'online' ? '搜索 TMDB（片名 / 演员 / 导演）' : '输入片名、导演或主演'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" variant="contained" onClick={handleSearch}>
                      搜索
                    </Button>
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            {view === 'online' ? (
              /* 在线：筛选变成搜索维度 */
              <Select
                displayEmpty
                value={onlineDimension}
                onChange={(e) => setOnlineDimension(e.target.value as TmdbDimension)}
                renderValue={(v) => DIMENSION_LABEL[v as TmdbDimension] ?? '片名'}
                inputProps={{ 'aria-label': '搜索维度' }}
              >
                <MenuItem value="title">片名</MenuItem>
                <MenuItem value="actor">演员</MenuItem>
                <MenuItem value="director">导演</MenuItem>
              </Select>
            ) : (
              /* 本地：按类型筛选（不显示「类型」浮动标签，框内默认显示「全部」） */
              <Select
                displayEmpty
                value={categoryId ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setCategoryId(v === '' ? null : Number(v));
                  setPage(1);
                }}
                renderValue={(v) => {
                  const key = v as number | '';
                  if (key === '') return '全部';
                  return String(categories.find((c) => Number(c.id) === Number(key))?.name ?? '全部');
                }}
                inputProps={{ 'aria-label': '按类型筛选' }}
              >
                <MenuItem value="">全部</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={String(c.id)} value={Number(c.id)}>
                    {String(c.name ?? '')}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>
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
            <ToggleButton value="favorite">收藏</ToggleButton>
            <ToggleButton value="all">库</ToggleButton>
            <ToggleButton value="online">在线</ToggleButton>
          </ToggleButtonGroup>

        </Stack>
      </Card>

      {titleText && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1 }}
        >
          <Typography variant="h6" fontWeight={800}>
            {titleText}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          {view === 'all' && (
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <Select
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value as VideoSortKey);
                  setPage(1);
                }}
                renderValue={(v) => `排序：${SORT_OPTIONS.find((o) => o.value === v)?.label ?? '最近添加'}`}
                inputProps={{ 'aria-label': '排序规则' }}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      )}

      {view === 'online' ? (
        <TmdbPanel
          keyword={keyword}
          dimension={onlineDimension}
          nonce={searchNonce}
          onImported={() => {
            loadFavorites();
            reloadList();
          }}
        />
      ) : view === 'recent' ? (
        /* 「最近」只看最近观看，网格与「库」一致：一行六个 */
        watchedMovies.length === 0 ? (
          <EmptyState
            icon={<MovieRoundedIcon sx={{ fontSize: 64 }} />}
            title="还没有观看记录"
            description="播放一部影片后，这里会显示最近看过的影片"
          />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(6,1fr)' },
              gap: 2.5,
            }}
          >
            {watchedMovies.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                isFavorite={favoriteIds.includes(m.id)}
                onOpen={() => router.push(`/content/movie/${m.id}`)}
                onToggleFavorite={() => toggleFavorite(m)}
              />
            ))}
          </Box>
        )
      ) : loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(6,1fr)' }, gap: 2.5 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} sx={{ borderRadius: 'var(--mm-radius-lg)', overflow: 'hidden' }}>
              <Skeleton variant="rectangular" sx={{ aspectRatio: '2 / 3', borderRadius: 'var(--mm-radius-lg)' }} />
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(6,1fr)' }, gap: 2.5 }}>
          {display.map((m) => (
            <MovieCard
              key={m.id}
              movie={m}
              isFavorite={favoriteIds.includes(m.id)}
              onOpen={() => router.push(`/content/movie/${m.id}`)}
              onToggleFavorite={() => toggleFavorite(m)}
            />
          ))}
        </Box>
      )}

      {total > 0 && view !== 'recent' && view !== 'online' && (
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

/** 影片卡片（普通网格与「最近」两个分区共用） */
function MovieCard({
  movie,
  isFavorite,
  onOpen,
  onToggleFavorite,
}: {
  movie: MovieItem;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const { mm } = useTheme();
  return (
    <Card
      className="mm-hover-lift"
      onClick={() => onOpen()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      sx={{
        position: 'relative',
        aspectRatio: '2 / 3',
        borderRadius: 'var(--mm-radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <CoverImage
        src={movie.pic}
        alt={movie.name}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          bgcolor: 'var(--mm-sunken)',
        }}
      />

      {/* 片名 / 导演：叠在海报上层 */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          px: 1.75,
          pt: 4,
          pb: 1.5,
          background: 'var(--mm-scrim)',
          color: 'var(--mm-scrim-text)',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.35 }} noWrap>
          {movie.name}
        </Typography>
        <Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.85 }}>
          {movie.directedBy || '未知导演'}
        </Typography>
      </Box>

      {/* 收藏 */}
      <Tooltip title={isFavorite ? '取消收藏' : '收藏'}>
        <IconButton
          size="small"
          aria-label={isFavorite ? '取消收藏' : '收藏'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            bgcolor: 'var(--mm-bg)',
            color: isFavorite ? mm.warning : 'var(--mm-text)',
            boxShadow: 'var(--mm-float)',
            '&:hover': { bgcolor: 'var(--mm-bg)' },
          }}
        >
          {isFavorite ? <StarRoundedIcon fontSize="small" /> : <StarBorderRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Card>
  );
}

/** 「最近」里的一个分区：小标题 + 两列卡片网格 */
function RecentColumn({
  title,
  emptyText,
  icon,
  children,
}: {
  title: string;
  emptyText: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const count = Children.count(children);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
        {title}
      </Typography>
      {count === 0 ? (
        <EmptyState icon={icon} title={emptyText} minHeight={180} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}
