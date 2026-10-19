'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { toast } from '@/lib/notify';
import {
  matchBookMetadataService,
  previewBookMetadataMergeService,
  updateBookService,
  type BookMetadataMatch,
  type MergePreview,
} from '@/api/book';
import { normalizeOnlineBook, type OnlineBookSource } from '@/lib/onlineBook';

const SOURCE_LABEL: Record<OnlineBookSource, string> = {
  google: 'Google Books',
  douban: '豆瓣',
  openlibrary: 'OpenLibrary',
};

/**
 * 搜刮元数据（阶段 4：字段加权匹配 + 合并）。从图书编辑弹窗进入。
 *
 * <p>两步：先在在线源里按书名 / 作者找出最像的候选（带匹配分），
 * 再按字段给出「填充 / 覆盖」建议，用户勾选后走既有的更新接口落库。
 * 服务端只算不改，**不会**自动覆盖手工整理过的内容。
 */
export default function BookMetadataMergeDialog({
  open,
  bookId,
  onClose,
  onApplied,
}: {
  open: boolean;
  bookId?: number;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [source, setSource] = useState<OnlineBookSource>('google');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [matches, setMatches] = useState<BookMetadataMatch[]>([]);

  const [selected, setSelected] = useState<BookMetadataMatch | null>(null);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState(false);

  const runMatch = useCallback(
    async (provider: OnlineBookSource) => {
      if (bookId == null) return;
      setLoading(true);
      setSearched(false);
      setMatches([]);
      setSelected(null);
      setPreview(null);
      setChecked({});
      try {
        const res = await matchBookMetadataService(provider, { bookId, size: 10 });
        setMatches(res.data ?? []);
      } catch {
        /* 拦截器已提示 */
      } finally {
        setLoading(false);
        setSearched(true);
      }
    },
    [bookId],
  );

  useEffect(() => {
    if (!open) return;
    setSource('google');
    void runMatch('google');
  }, [open, runMatch]);

  const changeSource = (next: OnlineBookSource) => {
    setSource(next);
    void runMatch(next);
  };

  const chooseCandidate = async (match: BookMetadataMatch) => {
    if (bookId == null || match.id == null) return;
    setSelected(match);
    setPreview(null);
    setPreviewLoading(true);
    try {
      const res = await previewBookMetadataMergeService(source, String(match.id), bookId);
      const data = res.data;
      setPreview(data ?? null);
      const initial: Record<string, boolean> = {};
      (data?.proposals ?? []).forEach((proposal) => {
        // 「填充」默认勾选，「覆盖」默认不勾（更谨慎）
        initial[proposal.field] = proposal.mode === 'fill';
      });
      setChecked(initial);
    } catch {
      /* 拦截器已提示 */
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggle = (field: string) => setChecked((prev) => ({ ...prev, [field]: !prev[field] }));

  const apply = async () => {
    if (bookId == null || !preview) return;
    const payload: Record<string, unknown> = { id: bookId };
    let count = 0;
    preview.proposals.forEach((proposal) => {
      if (checked[proposal.field]) {
        payload[proposal.field] = proposal.proposed;
        count += 1;
      }
    });
    if (count === 0) {
      toast.warning('请至少勾选一个字段');
      return;
    }
    setApplying(true);
    try {
      const res = await updateBookService(payload as Parameters<typeof updateBookService>[0]);
      if (res.code === 200) {
        toast.success(`已应用 ${count} 个字段`);
        onApplied();
        onClose();
      } else {
        toast.error(res.message || '更新失败');
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setApplying(false);
    }
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pt: 2.5 }}>搜刮元数据</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
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
            variant="outlined"
            startIcon={<SearchRoundedIcon />}
            disabled={loading || bookId == null}
            onClick={() => runMatch(source)}
          >
            重新搜刮
          </Button>
        </Stack>

        {loading ? (
          <EmptyState icon={<CircularProgress size={32} />} title="正在匹配在线书源…" minHeight={180} />
        ) : !searched ? null : matches.length === 0 ? (
          <EmptyState icon={<SearchRoundedIcon />} title="没有匹配到候选" description="换个书源或稍后再试" minHeight={180} />
        ) : (
          <Stack spacing={1.25} sx={{ maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
            {matches.map((match) => {
              const summary = normalizeOnlineBook(match, source);
              const active = selected?.id === match.id;
              return (
                <Box
                  key={`${source}-${String(match.id)}`}
                  onClick={() => chooseCandidate(match)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '44px minmax(0, 1fr) auto',
                    gap: 1.5,
                    alignItems: 'center',
                    p: 1.25,
                    cursor: 'pointer',
                    bgcolor: active ? 'var(--mm-sunken)' : 'var(--mm-bg)',
                    boxShadow: active ? 'var(--mm-sunken-sm)' : 'var(--mm-raised-sm)',
                  }}
                >
                  <Box sx={{ width: 44, height: 62, overflow: 'hidden', bgcolor: 'var(--mm-sunken)' }}>
                    <CoverImage
                      src={summary.cover}
                      alt={summary.title}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                      {summary.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {summary.author || '未知作者'}
                      {summary.year ? ` · ${summary.year}` : ''}
                    </Typography>
                  </Box>
                  {typeof match.matchScore === 'number' ? (
                    <Typography variant="caption" fontWeight={800}>
                      匹配 {Math.round(match.matchScore * 100)}%
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        )}

        {selected && (
          <>
            <Divider sx={{ my: 2.5 }} />
            {previewLoading ? (
              <EmptyState icon={<CircularProgress size={28} />} title="正在对比字段…" minHeight={140} />
            ) : preview && preview.proposals.length > 0 ? (
              <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                  字段建议（来源：{preview.source}）
                </Typography>
                <Stack spacing={1}>
                  {preview.proposals.map((proposal) => (
                    <FormControlLabel
                      key={proposal.field}
                      control={
                        <Checkbox
                          size="small"
                          checked={Boolean(checked[proposal.field])}
                          onChange={() => toggle(proposal.field)}
                        />
                      }
                      label={
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700}>
                            {proposal.label}
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              {proposal.mode === 'fill' ? '填充空字段' : '建议覆盖'}
                            </Typography>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {stringify(proposal.current)} → {stringify(proposal.proposed)}
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                  ))}
                </Stack>
              </Box>
            ) : preview ? (
              <EmptyState icon={<SearchRoundedIcon />} title="没有可补充的字段" description="本地信息已经比在线源更完整" minHeight={140} />
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
        <Button variant="outlined" onClick={onClose}>
          取消
        </Button>
        <Button variant="contained" disabled={applying || checkedCount === 0} onClick={apply}>
          {applying ? '应用中…' : `应用所选（${checkedCount}）`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** 字段值预览：空值显示「（空）」，过长截断，数组用 / 连接 */
function stringify(value: unknown): string {
  if (value === undefined || value === null || value === '') return '（空）';
  const text = Array.isArray(value) ? value.join(' / ') : String(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}
