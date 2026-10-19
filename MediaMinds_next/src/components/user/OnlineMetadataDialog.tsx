'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { searchDoubanService, searchGoogleBooksService, searchBookMetadataService } from '@/api/book';
import { normalizeOnlineBook, type OnlineBookSource, type OnlineBookSummary } from '@/lib/onlineBook';

const SOURCE_LABEL: Record<OnlineBookSource, string> = {
  google: 'Google Books',
  douban: '豆瓣',
  openlibrary: 'OpenLibrary',
};

/**
 * 在线元信息检索弹窗。
 *
 * <p>用于「上传图书文件 → 本地抽取元信息 → 检索在线源补全」这条链路：
 * 选中一条结果后，只把**非空字段**合并进当前表单，不重置用户已填内容。
 */
export default function OnlineMetadataDialog({
  open,
  initialQuery,
  onClose,
  onSelect,
}: {
  open: boolean;
  /** 打开时自动带入的关键词（通常是用本地抽取到的书名 / 作者） */
  initialQuery?: string;
  onClose: () => void;
  onSelect: (book: OnlineBookSummary) => void;
}) {
  const { mm } = useTheme();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<OnlineBookSource>('google');
  const [results, setResults] = useState<OnlineBookSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  /** 防止 `open` 不变时因其它依赖变化重复触发自动搜索 */
  const openedRef = useRef(false);

  const runSearch = useCallback(async (keyword: string, bookSource: OnlineBookSource) => {
    const q = keyword.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = (await (bookSource === 'google'
        ? searchGoogleBooksService(q, 1)
        : bookSource === 'douban'
          ? searchDoubanService(q, 1)
          : searchBookMetadataService(bookSource, q, 1))) as unknown as {
        data?: { results?: Array<Record<string, unknown>> };
      };
      setResults((res?.data?.results ?? []).map((raw) => normalizeOnlineBook(raw, bookSource)));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;

    const q = initialQuery?.trim() ?? '';
    setQuery(q);
    setResults([]);
    setSearched(false);
    if (q) void runSearch(q, source);
    // 只在「打开」这一刻初始化；source 取打开时的当前值
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const changeSource = (next: OnlineBookSource) => {
    setSource(next);
    if (query.trim() && searched) void runSearch(query, next);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pt: 2.5 }}>检索在线元信息</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="书名或作者"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch(query, source)}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={source}
              onChange={(e) => changeSource(e.target.value as OnlineBookSource)}
              inputProps={{ 'aria-label': '在线书源' }}
            >
              <MenuItem value="google">{SOURCE_LABEL.google}</MenuItem>
              <MenuItem value="douban">{SOURCE_LABEL.douban}</MenuItem>
              <MenuItem value="openlibrary">{SOURCE_LABEL.openlibrary}</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<SearchRoundedIcon />}
            disabled={loading || !query.trim()}
            onClick={() => runSearch(query, source)}
            sx={{ flexShrink: 0 }}
          >
            搜索
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <EmptyState icon={<CircularProgress size={36} />} title="正在检索在线元信息…" minHeight={220} />
        ) : !searched ? (
          <EmptyState
            icon={<SearchRoundedIcon />}
            title="同名书太多？"
            description="输入书名或作者，选中一条结果后会把出版社、出版日期、简介、封面等字段补进表单。"
            minHeight={220}
          />
        ) : results.length === 0 ? (
          <EmptyState icon={<SearchRoundedIcon />} title="没有找到相关图书" description="换个关键词或书源试试" />
        ) : (
          <Stack spacing={1.5} sx={{ maxHeight: 440, overflowY: 'auto', pr: 0.5 }}>
            {results.map((book) => (
              <Box
                key={`${book.source}-${book.id || book.title}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '56px minmax(0, 1fr) auto',
                  gap: 1.75,
                  alignItems: 'center',
                  p: 1.5,
                  bgcolor: 'var(--mm-bg)',
                  boxShadow: 'var(--mm-raised-sm)',
                }}
              >
                <Box sx={{ width: 56, height: 78, overflow: 'hidden', bgcolor: 'var(--mm-sunken)' }}>
                  <CoverImage
                    src={book.cover}
                    alt={book.title}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={800} noWrap>
                    {book.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {book.author || '未知作者'}
                  </Typography>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 0.5 }}>
                    {book.publisher ? (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {book.publisher}
                      </Typography>
                    ) : null}
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
                    ) : null}
                  </Stack>
                </Box>

                <Button variant="outlined" size="small" onClick={() => onSelect(book)}>
                  使用
                </Button>
              </Box>
            ))}
          </Stack>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          只合并有值的字段；表单里已经填好的其它内容不会被清空。
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
