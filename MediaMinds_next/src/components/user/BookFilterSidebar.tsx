'use client';

import { Box, Button, Checkbox, FormControlLabel, Skeleton, Stack, Typography } from '@mui/material';
import type { BookFacets, BookFilterSelection, FacetItem } from '@/api/book';
import { sourceLabel } from '@/lib/format';

/**
 * 图书浏览页的左侧筛选栏（参考 BookLore 的分面侧边栏）。
 *
 * <p>BookLore 有 26 个筛选维度，但 MediaMinds 的 `book` 表只有
 * 类型 / 作者 / 来源 三个可分组字段，所以这里就这三组。
 * 每项后面的数字是**全库**藏书量（后端 `/facets` 给的口径），
 * 不随已勾选条件变化——勾选时数字不跳动，便于叠加筛选。
 *
 * <p>样式遵循 Brutalism：0 圆角、实心描边、无阴影模糊、颜色只走 `--mm-*` 令牌。
 */

/** 数据来源 → 展示名。未收录的 source 原样展示，不隐藏 */

export default function BookFilterSidebar({
  facets,
  loading,
  selected,
  onToggleType,
  onToggleAuthor,
  onToggleSource,
  onClear,
}: {
  facets: BookFacets | null;
  loading: boolean;
  selected: BookFilterSelection;
  onToggleType: (value: number) => void;
  onToggleAuthor: (value: string) => void;
  onToggleSource: (value: string) => void;
  onClear: () => void;
}) {
  const activeCount = selected.typeIds.length + selected.authors.length + selected.sources.length;

  return (
    <Box sx={{ bgcolor: 'var(--mm-bg)', boxShadow: 'var(--mm-raised-sm)', p: 2, alignSelf: 'start' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          筛选
        </Typography>
        {facets && (
          <Typography variant="caption" sx={{ color: 'var(--mm-text-3)' }}>
            共 {facets.total} 本
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        {activeCount > 0 && (
          <Button size="small" onClick={onClear} sx={{ minWidth: 0, px: 0.75 }}>
            清除（{activeCount}）
          </Button>
        )}
      </Stack>

      {loading && !facets ? (
        <Stack spacing={0.75}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={24} />
          ))}
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          <FacetGroup
            title="类型"
            items={facets?.types ?? []}
            isChecked={(v) => selected.typeIds.includes(Number(v))}
            onToggle={(v) => onToggleType(Number(v))}
          />
          <FacetGroup
            title="作者"
            items={facets?.authors ?? []}
            isChecked={(v) => selected.authors.includes(v)}
            onToggle={onToggleAuthor}
            scroll
          />
          <FacetGroup
            title="来源"
            items={(facets?.sources ?? []).map((s) => ({ ...s, label: sourceLabel(s.value) }))}
            isChecked={(v) => selected.sources.includes(v)}
            onToggle={onToggleSource}
          />
        </Stack>
      )}
    </Box>
  );
}

/** 一组分面：小标题 + 复选列表（数量右对齐） */
function FacetGroup({
  title,
  items,
  isChecked,
  onToggle,
  scroll = false,
}: {
  title: string;
  items: FacetItem[];
  isChecked: (value: string) => boolean;
  onToggle: (value: string) => void;
  /** 条目多的分组（作者）限高滚动，避免把侧栏拉得过长 */
  scroll?: boolean;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ display: 'block', fontWeight: 800, color: 'var(--mm-text-3)', mb: 0.75, letterSpacing: '0.06em' }}
      >
        {title}
      </Typography>

      {items.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'var(--mm-text-3)' }}>
          暂无
        </Typography>
      ) : (
        <Box sx={scroll ? { maxHeight: 236, overflowY: 'auto', pr: 0.5 } : undefined}>
          {items.map((item) => (
            <FormControlLabel
              key={item.value}
              control={
                <Checkbox
                  size="small"
                  checked={isChecked(item.value)}
                  onChange={() => onToggle(item.value)}
                  sx={{ p: 0.25, mr: 0.5 }}
                />
              }
              label={
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                  <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                    {item.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--mm-text-3)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {item.count}
                  </Typography>
                </Stack>
              }
              sx={{
                m: 0,
                width: '100%',
                py: 0.25,
                px: 0.5,
                '&:hover': { bgcolor: 'var(--mm-sunken)' },
                '& .MuiFormControlLabel-label': { flex: 1, minWidth: 0, width: '100%' },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
