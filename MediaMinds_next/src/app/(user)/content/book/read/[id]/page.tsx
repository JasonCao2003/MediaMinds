'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { toast } from '@/lib/notify';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { pushRecent } from '@/lib/recent';
import { useAuthStore } from '@/stores/authStore';
import {
  getBookByIdService,
  getAllChaptersService,
  getChapterContentService,
  addFavoriteService,
  deleteFavoriteByBookService,
} from '@/api/book';
import type { Book, Chapter } from '@/types';

interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  theme: 'light' | 'sepia' | 'green' | 'dark';
  width: number;
}

type ReaderThemeKey = ReaderSettings['theme'];

/** 阅读底色的中文名（颜色本身由令牌派生，见组件内的 THEMES） */
const THEME_LABELS: Record<ReaderThemeKey, string> = {
  light: '明亮',
  sepia: '羊皮纸',
  green: '护眼',
  dark: '夜间',
};

const SETTINGS_KEY = 'mm_reader_settings';
const PROGRESS_KEY = 'mm_reader_progress';

export default function BookReaderPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { mm } = useTheme();
  const userId = useAuthStore((s) => s.info?.userId) || 0;
  const bookId = params?.id as string;

  const [book, setBook] = useState<Book>();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchChapter, setSearchChapter] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 18,
    lineHeight: 1.8,
    theme: 'light',
    width: 800,
  });

  const contentRef = useRef<HTMLDivElement | null>(null);

  // 初始化设置与进度
  useEffect(() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) setSettings((prev) => ({ ...prev, ...JSON.parse(s) }));
    } catch {
      /* ignore */
    }
  }, []);

  const saveSettings = (next: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const loadChapter = useCallback(
    async (chapter: Chapter) => {
      setCurrentChapter(chapter);
      setLoading(true);
      setContent('');
      setSidebarOpen(false);
      contentRef.current?.scrollTo({ top: 0 });
      try {
        const res = await getChapterContentService(chapter.id!);
        setContent((res.data as unknown as string) || '');
      } catch {
        setContent('');
      } finally {
        setLoading(false);
      }
      // 保存进度
      try {
        const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        progress[bookId] = chapter.id;
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
      } catch {
        /* ignore */
      }
    },
    [bookId],
  );

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      try {
        const [b, ch] = await Promise.all([getBookByIdService(bookId), getAllChaptersService(bookId)]);
        const bookData = b.data as unknown as Book;
        const chapterList = ((ch.data as unknown as Chapter[]) || []).slice().sort((a, c) => (a.chapterNumber || 0) - (c.chapterNumber || 0));
        setBook(bookData);
        setChapters(chapterList);

        const queryChapter = search?.get('chapterId');
        let target: Chapter | undefined;
        if (queryChapter) target = chapterList.find((c) => String(c.id) === queryChapter);
        if (!target) {
          try {
            const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
            target = chapterList.find((c) => String(c.id) === String(progress[bookId]));
          } catch {
            /* ignore */
          }
        }
        target = target || chapterList[0];
        if (target) loadChapter(target);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const currentIndex = useMemo(
    () => chapters.findIndex((c) => c.id === currentChapter?.id),
    [chapters, currentChapter],
  );
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  const filteredChapters = useMemo(
    () => chapters.filter((c) => !searchChapter || (c.chapterTitle || '').includes(searchChapter)),
    [chapters, searchChapter],
  );

  const paragraphs = useMemo(
    () => content.split(/\n+/).map((p) => p.trim()).filter(Boolean),
    [content],
  );

  // 阅读时长：正文加载完成且页面可见时计时（切走标签页 / 离开页面自动停）
  useActivityTracker('book', !loading && paragraphs.length > 0);

  // 记入「最近观看」（本地记录，供图书页的「最近观看」使用）
  useEffect(() => {
    if (!book?.id) return;
    pushRecent('book', {
      id: book.id,
      title: book.bookName || book.title || '未命名',
      subtitle: book.bookAuthor || book.author,
      cover: book.bookImg || book.cover,
    });
  }, [book]);

  const toggleFavoriteChapter = async () => {
    if (!currentChapter) return;
    const res = await addFavoriteService({ bookId: Number(bookId), chapterId: currentChapter.id });
    if (res.code === 200) toast.success('已收藏本章');
    else toast.info('当前章节已在收藏中');
  };

  /** 阅读底色：全部由设计令牌派生，不引入写死的底色 */
  const THEMES = useMemo<Record<ReaderThemeKey, { bg: string; fg: string }>>(
    () => ({
      light: { bg: mm.bg, fg: mm.text },
      sepia: { bg: alpha(mm.warning, 0.18), fg: mm.text },
      green: { bg: alpha(mm.success, 0.18), fg: mm.text },
      // 夜间：整块反白，正文与框内控件一起取反，保证对比度
      dark: { bg: mm.text, fg: mm.bg },
    }),
    [mm],
  );

  const readerTheme = THEMES[settings.theme];

  return (
    <Box>
      {/* 顶部工具栏：带描边的方块，滚动时吸附在内容区顶部 */}
      <Card
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          mb: 3,
          px: { xs: 1.5, md: 2.5 },
          py: 1.25,
          borderRadius: 'var(--mm-radius-lg)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()}>
            返回
          </Button>
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {book?.bookName || book?.title || '阅读'}
          </Typography>
          <Tooltip title="收藏本章">
            <span>
              <IconButton onClick={toggleFavoriteChapter} disabled={!currentChapter} aria-label="收藏本章">
                <StarBorderRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="阅读设置">
            <IconButton onClick={() => setSettingsOpen(true)} aria-label="阅读设置">
              <SettingsRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="目录">
            <IconButton onClick={() => setSidebarOpen(true)} aria-label="目录">
              <MenuBookRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Card>

      {/* 正文：灰底「纸面」+ 描边，保持阅读区安静 */}
      <Box
        ref={contentRef}
        sx={{
          mx: 'auto',
          width: '100%',
          maxWidth: settings.width,
          px: { xs: 2.5, sm: 4, md: 5.5 },
          py: { xs: 3, md: 4.5 },
          borderRadius: 'var(--mm-radius-xl)',
          bgcolor: readerTheme.bg,
          color: readerTheme.fg,
          boxShadow: 'var(--mm-sunken-sm)',
          // 夜间模式下整块取反，框内的文字与控件必须一起跟随，否则会黑底黑字
          '& .MuiTypography-root': { color: 'inherit' },
          '& .MuiDivider-root': { borderColor: 'currentColor', opacity: 0.3 },
          '& .MuiButton-outlined': { color: 'inherit', boxShadow: '0 0 0 2px currentColor' },
          '& .MuiButton-outlined.Mui-disabled': { color: 'inherit', opacity: 0.4 },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            disabled={!prevChapter}
            startIcon={<ArrowBackIosNewRoundedIcon />}
            onClick={() => prevChapter && loadChapter(prevChapter)}
          >
            上一章
          </Button>
          <Typography variant="h6" fontWeight={700} sx={{ textAlign: 'center', flex: 1, minWidth: 0 }} noWrap>
            {currentChapter?.chapterTitle || '加载中…'}
          </Typography>
          <Button
            variant="outlined"
            disabled={!nextChapter}
            endIcon={<ArrowForwardIosRoundedIcon />}
            onClick={() => nextChapter && loadChapter(nextChapter)}
          >
            下一章
          </Button>
        </Stack>

        {loading ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
            <CircularProgress />
            <Typography color="text.secondary">正在加载章节内容…</Typography>
          </Stack>
        ) : paragraphs.length === 0 ? (
          <Stack alignItems="center" spacing={1} sx={{ py: 8, color: 'var(--mm-text-3)' }}>
            <MenuBookRoundedIcon sx={{ fontSize: 56 }} />
            <Typography>暂无内容</Typography>
          </Stack>
        ) : (
          <Box>
            {paragraphs.map((p, i) => (
              <Typography
                key={i}
                component="p"
                sx={{
                  fontSize: settings.fontSize,
                  lineHeight: settings.lineHeight,
                  mb: 2,
                  textIndent: '2em',
                }}
              >
                {p}
              </Typography>
            ))}
            <Divider sx={{ my: 4 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
              <Button
                variant="outlined"
                disabled={!prevChapter}
                startIcon={<ArrowBackIosNewRoundedIcon />}
                onClick={() => prevChapter && loadChapter(prevChapter)}
              >
                上一章
              </Button>
              <Typography variant="body2" color="text.secondary" noWrap>
                {currentChapter?.chapterTitle}
              </Typography>
              <Button
                variant="outlined"
                disabled={!nextChapter}
                endIcon={<ArrowForwardIosRoundedIcon />}
                onClick={() => nextChapter && loadChapter(nextChapter)}
              >
                下一章
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      {/* 目录抽屉 */}
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        slotProps={{ paper: { sx: { width: 340, bgcolor: 'var(--mm-bg)' } } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={700}>
              目录
            </Typography>
            <IconButton onClick={() => setSidebarOpen(false)} aria-label="关闭目录">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
          <TextField
            size="small"
            fullWidth
            placeholder="搜索章节"
            value={searchChapter}
            onChange={(e) => setSearchChapter(e.target.value)}
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
        </Box>
        <List sx={{ px: 1.5, pb: 2 }}>
          {filteredChapters.map((c) => (
            <ListItemButton
              key={String(c.id)}
              selected={c.id === currentChapter?.id}
              onClick={() => loadChapter(c)}
              sx={{ borderRadius: 'var(--mm-radius)', mb: 0.5 }}
            >
              <ListItemText
                primary={`第 ${c.chapterNumber ?? ''} 章 · ${c.chapterTitle ?? ''}`}
                secondary={`${c.wordCount ?? 0} 字`}
              />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* 设置抽屉 */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        slotProps={{ paper: { sx: { width: 320, p: 3, bgcolor: 'var(--mm-bg)' } } }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          阅读设置
        </Typography>
        <Stack spacing={4}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              字体大小（{settings.fontSize}px）
            </Typography>
            <Slider
              min={12}
              max={28}
              value={settings.fontSize}
              onChange={(_, v) => saveSettings({ fontSize: v as number })}
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              行间距（{settings.lineHeight.toFixed(1)}）
            </Typography>
            <Slider
              min={1.2}
              max={2.5}
              step={0.1}
              value={settings.lineHeight}
              onChange={(_, v) => saveSettings({ lineHeight: v as number })}
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              阅读宽度（{settings.width}px）
            </Typography>
            <Slider min={600} max={1200} step={50} value={settings.width} onChange={(_, v) => saveSettings({ width: v as number })} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              阅读底色
            </Typography>
            <Stack direction="row" spacing={1.5}>
              {(Object.keys(THEMES) as ReaderThemeKey[]).map((key) => (
                <Tooltip key={key} title={THEME_LABELS[key]}>
                  <Button
                    onClick={() => saveSettings({ theme: key })}
                    aria-pressed={settings.theme === key}
                    sx={{
                      minWidth: 56,
                      height: 56,
                      p: 0,
                      // 色块里的字跟随该底色自身的文字色，夜间块才不会黑字压黑底
                      color: THEMES[key].fg,
                      bgcolor: THEMES[key].bg,
                      boxShadow: settings.theme === key ? '0 0 0 4px var(--mm-accent)' : 'var(--mm-raised-sm)',
                      '&:hover': { bgcolor: THEMES[key].bg, color: THEMES[key].fg, boxShadow: '0 0 0 4px var(--mm-accent)' },
                      '&:active': { bgcolor: THEMES[key].bg, boxShadow: 'none' },
                    }}
                  >
                    Aa
                  </Button>
                </Tooltip>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Drawer>
    </Box>
  );
}
