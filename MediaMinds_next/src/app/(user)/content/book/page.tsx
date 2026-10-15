'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { toast } from '@/lib/notify';
import { normalizePage } from '@/lib/page';
import {
  getBookListService,
  searchBookService,
  searchBookByAuthorService,
  getAllTypesService,
  getAllChaptersService,
  getFavoriteListService,
  addFavoriteService,
  deleteFavoriteByBookService,
} from '@/api/book';
import type { Book, BookType, Chapter } from '@/types';

interface BookItem {
  id: number;
  title: string;
  author: string;
  cover?: string;
  description?: string;
  typeId?: number;
  source?: string;
  isFavorite?: boolean;
}

const PAGE_SIZE = 12;

export default function BookViewPage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [favorites, setFavorites] = useState<BookItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [types, setTypes] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [typeId, setTypeId] = useState<number | ''>('');
  const [view, setView] = useState<'all' | 'favorite'>('all');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<BookItem | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const mapBook = useCallback((raw: Record<string, unknown>): BookItem => {
    const r = raw as unknown as Book & { title?: string; author?: string; cover?: string };
    return {
      id: Number(r.id),
      title: (r.title as string) || (r.bookName as string) || '未命名',
      author: (r.author as string) || (r.bookAuthor as string) || '未知作者',
      cover: (r.cover as string) || (r.bookImg as string),
      description: (r.description as string) || (r.bookDetails as string),
      typeId: r.typeId as number,
      source: r.source as string,
    };
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const res = await getFavoriteListService(1, 500);
      const { rows } = normalizePage<Record<string, unknown>>(res);
      setFavoriteIds(rows.map((r) => Number(r.id)).filter(Boolean));
    } catch {
      /* ignore */
    }
  }, []);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (keyword) {
        res = await searchBookService(keyword, page, PAGE_SIZE);
      } else {
        res = await getBookListService(page, PAGE_SIZE);
      }
      const { rows, total: t } = normalizePage<Record<string, unknown>>(res);
      setBooks(rows.map(mapBook));
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [keyword, page, mapBook]);

  const loadFavoriteBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFavoriteListService(page, PAGE_SIZE);
      const { rows, total: t } = normalizePage<Record<string, unknown>>(res);
      setFavorites(rows.map((r) => ({ ...mapBook(r), isFavorite: true })));
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [page, mapBook]);

  useEffect(() => {
    getAllTypesService()
      .then((res) => setTypes((res.data as unknown as BookType[]) || []))
      .catch(() => undefined);
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (view === 'all') loadBooks();
    else loadFavoriteBooks();
  }, [view, loadBooks, loadFavoriteBooks]);

  const display = useMemo(() => {
    const list = view === 'all' ? books : favorites;
    if (view === 'favorite') return list;
    return list.map((b) => ({ ...b, isFavorite: favoriteIds.includes(b.id) }));
  }, [view, books, favorites, favoriteIds]);

  const typeName = (id?: number) => types.find((t) => t.id === id)?.typeName || '未分类';

  const toggleFavorite = async (book: BookItem) => {
    const isFav = favoriteIds.includes(book.id);
    if (isFav) {
      const res = await deleteFavoriteByBookService(book.id);
      if (res.code === 200) {
        toast.success('取消收藏成功');
        setFavoriteIds((ids) => ids.filter((i) => i !== book.id));
        if (view === 'favorite') loadFavoriteBooks();
      }
    } else {
      const res = await addFavoriteService({ bookId: book.id, chapterId: 0 });
      if (res.code === 200) {
        toast.success('收藏成功');
        setFavoriteIds((ids) => [...ids, book.id]);
      }
    }
  };

  const openDetail = async (book: BookItem) => {
    setSelected(book);
    setDetailOpen(true);
    try {
      const res = await getAllChaptersService(book.id);
      setChapters((res.data as unknown as Chapter[]) || []);
    } catch {
      setChapters([]);
    }
  };

  const startReading = (book: BookItem, chapter?: Chapter) => {
    const q = chapter ? `?chapterId=${chapter.id}` : '';
    router.push(`/content/book/read/${book.id}${q}`);
  };

  const titleText =
    view === 'favorite'
      ? '我的收藏'
      : keyword
        ? `“${keyword}” 的搜索结果`
        : typeId
          ? `${typeName(Number(typeId))} 分类图书`
          : '全部图书';

  return (
    <Box>
      <PageHeader title="图书浏览" subtitle="探索知识宝库，在线阅读与收藏" icon={<AutoStoriesRoundedIcon />} />

      <Card sx={{ p: 2.5, mb: 3, borderRadius: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="输入图书名或作者名"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                loadBooks();
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
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>分类</InputLabel>
            <Select
              label="分类"
              value={typeId}
              onChange={(e) => {
                setTypeId(e.target.value as number | '');
                setPage(1);
              }}
            >
              <MenuItem value="">所有分类</MenuItem>
              {types.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.typeName}
                </MenuItem>
              ))}
            </Select>
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
            <ToggleButton value="all">全部图书</ToggleButton>
            <ToggleButton value="favorite">我的收藏</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            onClick={() => {
              setPage(1);
              loadBooks();
            }}
          >
            搜索
          </Button>
        </Stack>
      </Card>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        {titleText}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 3 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} sx={{ borderRadius: 4 }}>
              <Skeleton variant="rectangular" height={200} />
              <CardContent>
                <Skeleton variant="text" />
                <Skeleton variant="text" width="60%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : display.length === 0 ? (
        <EmptyState
          icon={<MenuBookRoundedIcon sx={{ fontSize: 64 }} />}
          title={view === 'favorite' ? '暂无收藏图书' : '没有找到相关图书'}
          description="换个关键词或分类试试吧"
        />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 3 }}>
          {display.map((book) => (
            <Card
              key={book.id}
              className="mm-hover-lift"
              onClick={() => openDetail(book)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openDetail(book);
                }
              }}
              sx={{ borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }}
            >
              <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={book.cover || '/cover.jpg'}
                    alt={book.title}
                    sx={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', bgcolor: 'action.hover' }}
                  />
                  <Chip
                    label={typeName(book.typeId)}
                    size="small"
                    sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(0,0,0,.55)', color: '#fff' }}
                  />
                  <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <Tooltip title="在线阅读">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          startReading(book);
                        }}
                        sx={{ bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: '#fff' } }}
                      >
                        <MenuBookOutlinedIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={book.isFavorite ? '取消收藏' : '收藏'}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(book);
                        }}
                        sx={{ bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: '#fff' } }}
                      >
                        {book.isFavorite ? (
                          <StarRoundedIcon fontSize="small" sx={{ color: '#F59E0B' }} />
                        ) : (
                          <StarBorderRoundedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {book.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {book.author}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 32 }}
                  >
                    {book.description || '暂无简介'}
                  </Typography>
                </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {total > 0 && (
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ChevronLeftRoundedIcon />}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </Button>
          <Typography variant="body2" color="text.secondary">
            第 {page} 页 / 共 {Math.ceil(total / PAGE_SIZE)} 页 · {total} 本
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

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{selected?.title}</DialogTitle>
        <DialogContent>
          {selected && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr' }, gap: 3 }}>
              <Box
                component="img"
                src={selected.cover || '/cover.jpg'}
                alt={selected.title}
                sx={{ width: '100%', borderRadius: 3, display: 'block' }}
              />
              <Box>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>作者：</strong>
                  {selected.author}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>分类：</strong>
                  {typeName(selected.typeId)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ my: 2, whiteSpace: 'pre-wrap' }}>
                  {selected.description || '暂无简介'}
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" startIcon={<MenuBookOutlinedIcon />} onClick={() => startReading(selected)}>
                    开始阅读
                  </Button>
                  <Button
                    variant="outlined"
                    color={favoriteIds.includes(selected.id) ? 'warning' : 'inherit'}
                    startIcon={favoriteIds.includes(selected.id) ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
                    onClick={() => toggleFavorite(selected)}
                  >
                    {favoriteIds.includes(selected.id) ? '取消收藏' : '收藏'}
                  </Button>
                </Stack>
              </Box>
            </Box>
          )}

          <Typography variant="h6" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
            章节列表
          </Typography>
          {chapters.length === 0 ? (
            <EmptyState title="暂无章节" minHeight={140} />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={80}>章节</TableCell>
                  <TableCell>标题</TableCell>
                  <TableCell width={100}>字数</TableCell>
                  <TableCell width={100}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chapters.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.chapterNumber}</TableCell>
                    <TableCell>{c.chapterTitle}</TableCell>
                    <TableCell>{c.wordCount ?? '—'}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => selected && startReading(selected, c)}>
                        阅读
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
