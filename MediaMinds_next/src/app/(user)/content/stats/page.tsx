'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AutoGrid from '@/components/common/AutoGrid';
import EmptyState from '@/components/common/EmptyState';
import { toast } from '@/lib/notify';
import { compactDuration, friendlyDate, humanDuration } from '@/lib/format';
import { normalizePage } from '@/lib/page';
import { useAuthStore } from '@/stores/authStore';
import {
  generateAnnualReportService,
  getActivityAnnualService,
  getActivitySummaryService,
  getSavedAnnualReportService,
  saveAnnualReportService,
} from '@/api/activity';
import { getFavoriteListService } from '@/api/book';
import { getWatchHistoryService } from '@/api/video';
import { getAllCollectionsService } from '@/api/music';
import type { ActivityDay, ActivitySummary, AnnualReport } from '@/types';

const RANGES = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年' },
  { key: 'all', label: '累计' },
] as const;

type RangeKey = (typeof RANGES)[number]['key'];

const CHART_DAYS = 30;

export default function StatsPage() {
  const { mm } = useTheme();
  const info = useAuthStore((s) => s.info);

  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<RangeKey>('today');

  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [report, setReport] = useState<AnnualReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  /** 读取已保存报告的过程（与「生成中」区分，避免文案错乱） */
  const [reportFetching, setReportFetching] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const res = await getActivitySummaryService(CHART_DAYS);
      if (res.code === 200 && res.data) {
        setSummary(res.data);
        const years = res.data.years || [];
        if (years.length > 0 && !years.includes(reportYear)) {
          setReportYear(years[0]);
        }
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // 年份变化时读取库里已保存的报告 —— 有就直接展示，不必重新生成
  useEffect(() => {
    let cancelled = false;
    setReportFetching(true);
    setReport(null);
    getSavedAnnualReportService(reportYear)
      .then((res) => {
        if (!cancelled && res.code === 200) setReport(res.data ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReportFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportYear]);

  const TYPES = useMemo(
    () => [
      { key: 'book' as const, label: '图书', icon: <MenuBookRoundedIcon />, color: mm.info },
      { key: 'video' as const, label: '影视', icon: <MovieRoundedIcon />, color: mm.success },
      { key: 'music' as const, label: '音乐', icon: <HeadphonesRoundedIcon />, color: mm.warning },
    ],
    [mm],
  );

  const range = summary ? summary[rangeKey] : null;
  const rangeTotal = range?.total ?? 0;

  const daily = useMemo(() => {
    const list: ActivityDay[] = summary?.daily ?? [];
    return list.slice(-CHART_DAYS);
  }, [summary]);

  const chartMax = useMemo(() => Math.max(...daily.map((d) => d.total), 1), [daily]);

  /** 生成年度报告：前端组装数据 → agent-service 由大模型撰写 */
  const handleGenerate = async () => {
    setReportLoading(true);
    setReport(null);
    try {
      const [annual, books, movies, songs] = await Promise.all([
        getActivityAnnualService(reportYear),
        fetchBookTitles(),
        fetchMovieTitles(),
        fetchSongTitles(),
      ]);
      if (annual.code !== 200 || !annual.data) {
        toast.error('获取年度数据失败');
        return;
      }
      const a = annual.data;
      const res = await generateAnnualReportService({
        year: reportYear,
        userName: info?.nickName || info?.userName || '你',
        totalSeconds: a.totalSeconds,
        bookSeconds: a.bookSeconds,
        musicSeconds: a.musicSeconds,
        videoSeconds: a.videoSeconds,
        activeDays: a.activeDays,
        longestStreak: a.longestStreak,
        firstActiveDate: a.firstActiveDate,
        busiestDay: a.busiestDay,
        busiestDaySeconds: a.busiestDaySeconds,
        busiestMonth: a.busiestMonth,
        busiestMonthSeconds: a.busiestMonthSeconds,
        monthlySeconds: a.monthlySeconds,
        books,
        movies,
        songs,
      });
      if (res.code === 200 && res.data) {
        // 落库（同一年覆盖），并用返回的版本展示，这样能拿到「最近生成时间」
        let saved = res.data;
        try {
          const savedRes = await saveAnnualReportService(res.data);
          if (savedRes.code === 200 && savedRes.data) saved = savedRes.data;
        } catch {
          /* 保存失败不影响本次展示 */
        }
        setReport(saved);
        if (saved.engine === 'rule' && saved.error) {
          toast.info('已生成规则式报告：' + saved.error);
        } else {
          toast.success('年度报告已生成并保存');
        }
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <Box>
      {/* ── 时间范围 ─────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <ToggleButtonGroup
          exclusive
          value={rangeKey}
          onChange={(_, v) => v && setRangeKey(v as RangeKey)}
        >
          {RANGES.map((r) => (
            <ToggleButton key={r.key} value={r.key}>
              {r.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {summary && summary.currentStreak > 0 && (
          <Chip
            icon={<LocalFireDepartmentRoundedIcon />}
            label={`连续 ${summary.currentStreak} 天`}
          />
        )}
      </Stack>

      {/* ── 总时长 + 三类型占比 ─────────────────────────────── */}
      <AutoGrid minWidth={300} gap={3} columns={{ xs: '1fr', md: 'minmax(280px, 1fr) 1.4fr' }}>
        <Card sx={{ p: { xs: 3, md: 3.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="overline" color="text.secondary">
            {RANGES.find((r) => r.key === rangeKey)?.label}消费时长
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={200} height={64} />
          ) : (
            <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.03em', my: 0.5 }}>
              {humanDuration(rangeTotal)}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            只统计真正在阅读 / 观看 / 收听的时间
          </Typography>
        </Card>

        <Card sx={{ p: { xs: 3, md: 3.5 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5 }}>
            三类占比
          </Typography>
          <Stack spacing={2}>
            {TYPES.map((t) => {
              const value = range ? range[t.key] : 0;
              const pct = rangeTotal > 0 ? Math.round((value / rangeTotal) * 100) : 0;
              return (
                <Box key={t.key}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                    <Box sx={{ display: 'grid', placeItems: 'center', color: t.color, '& svg': { fontSize: 18 } }}>
                      {t.icon}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t.label}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {humanDuration(value)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 40, textAlign: 'right' }}>
                      {pct}%
                    </Typography>
                  </Stack>
                  {/* 占比条：Brutalism 的矩形硬边 */}
                  <Box
                    sx={{
                      height: 14,
                      bgcolor: 'var(--mm-sunken)',
                      boxShadow: 'var(--mm-sunken-sm)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        width: `${pct}%`,
                        bgcolor: t.color,
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Card>
      </AutoGrid>

      {/* ── 近 30 天柱状图 ───────────────────────────────────── */}
      <Card sx={{ mt: 3, p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            近 {CHART_DAYS} 天
          </Typography>
          <Typography variant="caption" color="text.secondary">
            悬停查看当天明细
          </Typography>
        </Stack>

        {loading ? (
          <Skeleton variant="rectangular" height={150} />
        ) : (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '3px',
                height: 150,
                px: 0.5,
                borderBottom: '2px solid var(--mm-border-color)',
              }}
            >
              {daily.map((d) => (
                <Tooltip
                  key={d.date}
                  arrow
                  title={
                    <Box sx={{ py: 0.25 }}>
                      <div>{friendlyDate(d.date)}</div>
                      <div>合计 {humanDuration(d.total)}</div>
                      <div>图书 {humanDuration(d.book)}</div>
                      <div>影视 {humanDuration(d.video)}</div>
                      <div>音乐 {humanDuration(d.music)}</div>
                    </Box>
                  }
                >
                  <Box
                    sx={{
                      flex: 1,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      cursor: 'default',
                      minWidth: 4,
                      '&:hover': { bgcolor: 'var(--mm-sunken)' },
                    }}
                  >
                    {(['video', 'music', 'book'] as const).map((k) => {
                      const v = d[k];
                      if (v <= 0) return null;
                      const color = k === 'book' ? mm.info : k === 'video' ? mm.success : mm.warning;
                      return (
                        <Box
                          key={k}
                          sx={{
                            height: `${(v / chartMax) * 100}%`,
                            minHeight: 3,
                            bgcolor: color,
                          }}
                        />
                      );
                    })}
                  </Box>
                </Tooltip>
              ))}
            </Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {daily.length > 0 ? friendlyDate(daily[0].date) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                单日峰值 {compactDuration(chartMax)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {daily.length > 0 ? friendlyDate(daily[daily.length - 1].date) : '—'}
              </Typography>
            </Stack>
          </>
        )}
      </Card>

      {/* ── 使用习惯 ─────────────────────────────────────────── */}
      <Card sx={{ mt: 3, p: { xs: 2.5, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5 }}>
          使用习惯
        </Typography>
        <AutoGrid minWidth={160} gap={2} columns={{ xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }}>
          <HabitStat label="当前连续" value={summary ? `${summary.currentStreak} 天` : '—'} />
          <HabitStat label="历史最长" value={summary ? `${summary.longestStreak} 天` : '—'} />
          <HabitStat label="累计天数" value={summary ? `${summary.totalActiveDays} 天` : '—'} />
          <HabitStat label="首次使用" value={friendlyDate(summary?.firstActiveDate)} />
        </AutoGrid>
      </Card>

      {/* ── 年度报告 ─────────────────────────────────────────── */}
      <Card sx={{ mt: 3, p: { xs: 2.5, md: 3.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ mb: report ? 3 : 0 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box sx={{ color: mm.accentText, display: 'grid', placeItems: 'center' }}>
                <CalendarMonthRoundedIcon />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                年度报告
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              把这一年读过、看过、听过的东西交给智能体，生成一份只属于你的回顾。
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
            {summary && summary.years.length > 1 && (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={reportYear}
                onChange={(_, v) => v && setReportYear(Number(v))}
              >
                {summary.years.map((y) => (
                  <ToggleButton key={y} value={y}>
                    {y}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}
            <Button
              variant="contained"
              startIcon={reportLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon />}
              disabled={reportLoading}
              onClick={handleGenerate}
            >
              {reportLoading ? '生成中…' : '生成年度报告'}
            </Button>
          </Stack>
        </Stack>

        {(reportLoading || reportFetching) && (
          <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
            <CircularProgress />
            <Typography color="text.secondary">
              {reportLoading ? '正在回顾你的一年…' : '正在读取已保存的报告…'}
            </Typography>
          </Stack>
        )}

        {!reportLoading && !reportFetching && report && (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
              <Chip
                label={report.engine === 'langchain4j' ? `AI 生成 · ${report.model}` : '规则式报告'}
                color={report.engine === 'langchain4j' ? 'primary' : 'default'}
              />
              <Chip label={`${report.year} 年`} />
              {report.updatedAt && <Chip label={`最近生成 ${report.updatedAt}`} />}
            </Stack>

            {report.headline && (
              <Box
                sx={{
                  p: { xs: 2.5, md: 3 },
                  mb: 3,
                  bgcolor: 'var(--mm-sunken)',
                  boxShadow: 'var(--mm-sunken-sm)',
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.5, letterSpacing: '-0.02em' }}>
                  {report.headline}
                </Typography>
              </Box>
            )}

            <Stack spacing={3}>
              {report.sections.map((s, i) => (
                <Box key={`${s.heading}-${i}`}>
                  <Typography variant="overline" sx={{ color: mm.accentText }}>
                    {s.heading}
                  </Typography>
                  <Typography sx={{ mt: 0.5, lineHeight: 1.85, fontSize: '1.02rem', whiteSpace: 'pre-wrap' }}>
                    {s.body}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {!reportLoading && !reportFetching && !report && !loading && (
          <EmptyState
            icon={<InsightsRoundedIcon />}
            title="还没有生成年度报告"
            description="点击右上角按钮，智能体会根据你的时长与内容清单写一份回顾。"
            minHeight={180}
          />
        )}
      </Card>
    </Box>
  );
}

/** 单个习惯指标 */
function HabitStat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 2, bgcolor: 'var(--mm-sunken)', boxShadow: 'var(--mm-sunken-sm)' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}

// ────────────────────── 年度报告用的内容清单 ──────────────────────

/** 收藏的图书标题 */
async function fetchBookTitles(): Promise<string[]> {
  try {
    const res = await getFavoriteListService(1, 100);
    const { rows } = normalizePage<Record<string, unknown>>(res);
    return rows
      .map((r) => String(r.bookName || r.title || r.name || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** 观看历史里的影视标题 */
async function fetchMovieTitles(): Promise<string[]> {
  try {
    const res = (await getWatchHistoryService(1, 100)) as {
      data?: { records?: Record<string, unknown>[] };
    };
    const rows = res?.data?.records ?? [];
    return rows
      .map((r) => String(r.title || r.movieName || r.name || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** 收藏的歌曲名 */
async function fetchSongTitles(): Promise<string[]> {
  try {
    const res = await getAllCollectionsService({ page: 1, size: 100 });
    const { rows } = normalizePage<Record<string, unknown>>(res);
    return rows
      .map((r) => String(r.name || r.songName || r.title || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
