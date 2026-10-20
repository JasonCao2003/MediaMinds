'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import LibraryAddRoundedIcon from '@mui/icons-material/LibraryAddRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { toast } from '@/lib/notify';
import { normalizeOnlineBook, type OnlineBookSource, type OnlineBookSummary } from '@/lib/onlineBook';
import {
  searchDoubanService,
  importDoubanBookService,
  searchGoogleBooksService,
  importGoogleBookService,
  searchBookMetadataService,
  importBookMetadataService,
  stageBookFileService,
  importBookFromProviderService,
  discardStagingService,
} from '@/api/book';

/** 在线搜索维度：书名 / 作者 */

export type { OnlineBookSource } from '@/lib/onlineBook';

/** 书源单页条数兜底（Google / 豆瓣后端均为 20）；拿不到后端 pageSize 时用它判定是否还有更多 */
const FALLBACK_PAGE_SIZE = 20;

const SOURCE_LABEL: Record<OnlineBookSource, string> = {
  google: 'Google Books',
  douban: '豆瓣',
  openlibrary: 'OpenLibrary',
};

/**
 * 在线图书结果面板（**受页面工具栏驱动**）。
 *
 * 搜索关键词与维度都由外层传入——工具栏里的搜索框和筛选下拉就是它的输入，
 * 面板自己不再有搜索框，避免页面上出现两组搜索。
 *
 * 目前只接 Google Books，关键词对书名 / 作者做模糊匹配，不再按维度二次过滤。
 */
export default function OnlineBooksPanel({
  keyword,
  nonce,
  source = 'google',
  onImported,
}: {
  keyword: string;
  /** 每次点「搜索」自增，用于强制重搜同一个关键词 */
  nonce: number;
  /** 在线书源，默认 Google Books */
  source?: OnlineBookSource;
  /** 入库成功后通知外层刷新本地书库 / 分面 */
  onImported?: () => void;
}) {
  const { mm } = useTheme();

  const [books, setBooks] = useState<OnlineBookSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [importingId, setImportingId] = useState('');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  /** 元信息详情弹窗当前展示的书 */
  const [detail, setDetail] = useState<OnlineBookSummary | null>(null);
  /** 详情里「上传图书文件」的上传态 */
  const [uploading, setUploading] = useState(false);
  /** 上传时是否自动生成章节（EPUB / PDF） */
  const [generateChapters, setGenerateChapters] = useState(true);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  /** 搜索代号：关键词 / 维度 / 书源变化时自增，用于丢弃在途的翻页响应 */
  const searchKeyRef = useRef(0);

  const sourceLabel = SOURCE_LABEL[source];

  /** 按书源选择搜索接口：Google / 豆瓣 走各自接口，其余走统一接口 */
  const searchService = useCallback(
    (query: string, p: number) => {
      if (source === 'google') return searchGoogleBooksService(query, p);
      if (source === 'douban') return searchDoubanService(query, p);
      return searchBookMetadataService(source, query, p);
    },
    [source],
  );

  useEffect(() => {
    const kw = keyword.trim();
    searchKeyRef.current += 1;
    if (!kw) {
      setBooks([]);
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
        const res = (await searchService(kw, 1)) as unknown as {
          data?: { results?: Array<Record<string, unknown>>; count?: number; pageSize?: number };
        };
        if (cancelled) return;
        const results = res?.data?.results ?? [];
        const pageSize = Number(res?.data?.pageSize) || FALLBACK_PAGE_SIZE;
        setBooks(results.map((raw) => normalizeOnlineBook(raw, source)));
        setHasMore((res?.data?.count ?? results.length) >= pageSize);
      } catch {
        if (!cancelled) setBooks([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSearched(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keyword, nonce, source, searchService]);

  /** 拉取下一页原始结果并追加（滚动到底部触发），维度过滤在渲染时进行 */
  const loadMore = useCallback(async () => {
    const kw = keyword.trim();
    if (!kw || loadingMore || !hasMore) return;
    const next = page + 1;
    const myKey = searchKeyRef.current;
    setLoadingMore(true);
    try {
      const res = (await searchService(kw, next)) as unknown as {
        data?: { results?: Array<Record<string, unknown>>; count?: number; pageSize?: number };
      };
      if (myKey !== searchKeyRef.current) return;
      const results = res?.data?.results ?? [];
      const pageSize = Number(res?.data?.pageSize) || FALLBACK_PAGE_SIZE;
      setBooks((prev) => [...prev, ...results.map((raw) => normalizeOnlineBook(raw, source))]);
      setHasMore((res?.data?.count ?? results.length) >= pageSize);
      setPage(next);
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoadingMore(false);
    }
  }, [keyword, page, loadingMore, hasMore, searchService, source]);

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

  const importBook = async (book: OnlineBookSummary) => {
    setImportingId(book.id);
    try {
      const res = (await (source === 'google'
        ? importGoogleBookService(book.id)
        : source === 'douban'
          ? importDoubanBookService(book.id)
          : importBookMetadataService(source, book.id))) as unknown as {
        code?: number;
        message?: string;
        msg?: string;
        data?: { existed?: boolean; book?: { id?: number } };
      };
      if (res?.code === 200) {
        // 只负责入库；加入哪个书单由书库卡片上的收藏图标选择
        toast.success('已加入书库');
        onImported?.();
      } else {
        toast.error(res?.message || res?.msg || '入库失败');
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setImportingId('');
    }
  };

  /**
   * 入口①：把用户选的文件与当前在线元信息绑定入库。
   *
   * <p>先暂存拿 token，再由后端按 `source + providerId` 取在线元信息；
   * 入库失败时主动丢弃暂存（成功时后端已消费）。
   */
  const uploadForDetail = async (file: File) => {
    if (!detail) return;
    setUploading(true);
    let token: string | null = null;
    let imported = false;
    try {
      const staged = await stageBookFileService(file);
      if (staged.code !== 200 || !staged.data?.token) {
        toast.error(staged.message || staged.msg || '文件解析失败');
        return;
      }
      token = staged.data.token;

      const res = await importBookFromProviderService(token, source, detail.id, true, generateChapters);
      if (res.code === 200) {
        imported = true;
        toast.success(`已入库：${detail.title}`);
        setDetail(null);
        onImported?.();
      } else {
        toast.error(res.message || res.msg || '入库失败');
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      if (token && !imported) {
        discardStagingService(token).catch(() => {
          /* 已过期或已消费，忽略 */
        });
      }
      setUploading(false);
    }
  };

  // ────────────────────────── 渲染 ──────────────────────────

  const kw = keyword.trim();

  if (!kw) {
    return (
      <EmptyState
        icon={<SearchRoundedIcon />}
        title="在线搜索"
        description={`在上面的搜索框里输入书名或作者，${sourceLabel} 会同时做模糊匹配。`}
        minHeight={240}
      />
    );
  }

  if (loading) {
    return <EmptyState icon={<CircularProgress size={36} />} title={`正在搜索${sourceLabel}图书…`} minHeight={240} />;
  }

  if (!searched) return null;

  if (books.length === 0) {
    return <EmptyState icon={<SearchRoundedIcon />} title="没有找到相关图书" description="换个书名或作者关键词试试" />;
  }

  // 只保留 Google Books；不再按书名 / 作者分流，后端按关键词对两者做模糊匹配
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
          {books.map((book) => (
            <Card
              key={book.id || book.title}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(book)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setDetail(book);
                }
              }}
              sx={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
            >
              <CoverImage
                src={book.cover}
                alt={book.title}
                sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block', bgcolor: 'var(--mm-sunken)' }}
              />
              <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: 40,
                  }}
                >
                  {book.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {book.author || '未知作者'}
                </Typography>
                {book.publisher ? (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {book.publisher}
                  </Typography>
                ) : null}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  {book.year ? (
                    <Typography variant="caption" color="text.secondary">
                      {book.year}
                    </Typography>
                  ) : null}
                  {book.rating > 0 ? (
                    <Stack direction="row" spacing={0.25} alignItems="center">
                      <StarRoundedIcon sx={{ fontSize: 14, color: mm.warning }} />
                      <Typography variant="caption" color="text.secondary">
                        {book.rating.toFixed(1)}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      暂无评分
                    </Typography>
                  )}
                </Stack>
                <Box sx={{ mt: 'auto' }}>
                  <Button
                    fullWidth
                    size="small"
                    variant="contained"
                    startIcon={<LibraryAddRoundedIcon fontSize="small" />}
                    disabled={importingId === book.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void importBook(book);
                    }}
                  >
                    入库
                  </Button>
                </Box>
              </Box>
            </Card>
          ))}
      </Box>

      <Box>
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

      {/* 元信息详情：点卡片打开，可只导入元信息，也可上传文件绑定入库 */}
      <Dialog
        open={Boolean(detail)}
        onClose={() => {
          if (!uploading) setDetail(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, pt: 2.5 }}>元信息详情</DialogTitle>
        <DialogContent>
          {detail && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '180px minmax(0, 1fr)' },
                gap: 2.5,
              }}
            >
              <CoverImage
                src={detail.cover}
                alt={detail.title}
                sx={{ width: '100%', borderRadius: 'var(--mm-radius)', display: 'block', bgcolor: 'var(--mm-sunken)' }}
              />

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.3 }}>
                  {detail.title}
                </Typography>
                {detail.subtitle ? (
                  <Typography variant="subtitle2" color="text.secondary">
                    {detail.subtitle}
                  </Typography>
                ) : null}

                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    作者：{detail.author || '未知作者'}
                  </Typography>
                  {detail.publisher ? (
                    <Typography variant="body2" color="text.secondary">
                      出版社：{detail.publisher}
                    </Typography>
                  ) : null}
                  {detail.year ? (
                    <Typography variant="body2" color="text.secondary">
                      出版年：{detail.year}
                    </Typography>
                  ) : null}
                  {detail.pageCount ? (
                    <Typography variant="body2" color="text.secondary">
                      {detail.pageCount} 页
                    </Typography>
                  ) : null}
                  {detail.rating > 0 ? (
                    <Stack direction="row" spacing={0.25} alignItems="center">
                      <StarRoundedIcon sx={{ fontSize: 16, color: mm.warning }} />
                      <Typography variant="body2" color="text.secondary">
                        {detail.rating.toFixed(1)}
                        {detail.reviewCount ? `（${detail.reviewCount} 人评分）` : ''}
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>

                {detail.description ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2, maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap' }}
                  >
                    {detail.description}
                  </Typography>
                ) : null}

                <Divider sx={{ my: 2.5 }} />

                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<LibraryAddRoundedIcon />}
                    disabled={importingId === detail.id}
                    onClick={() => importBook(detail)}
                  >
                    入库
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<UploadFileRoundedIcon />}
                    disabled={uploading || !detail.id}
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    {uploading ? '上传中…' : '上传图书文件'}
                  </Button>
                </Stack>

                <FormControlLabel
                  sx={{ mt: 1.5, alignItems: 'center' }}
                  control={
                    <Checkbox
                      size="small"
                      checked={generateChapters}
                      onChange={(e) => setGenerateChapters(e.target.checked)}
                      disabled={uploading}
                    />
                  }
                  label={<Typography variant="body2">自动生成章节（EPUB / PDF）</Typography>}
                />

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {uploading
                    ? '正在上传并绑定文件，请不要关闭弹窗…'
                    : `上传 EPUB / PDF / CBZ 后，文件会与这条${sourceLabel}元信息绑定入库。`}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <input
        ref={uploadInputRef}
        type="file"
        hidden
        accept=".epub,.pdf,.cbz"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadForDetail(file);
          e.target.value = '';
        }}
      />
    </Box>
  );
}
