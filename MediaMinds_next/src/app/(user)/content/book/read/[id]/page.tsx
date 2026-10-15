'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Divider,
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
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { toast } from '@/lib/notify';
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

const THEMES: Record<ReaderSettings['theme'], { bg: string; text: string; label: string }> = {
  light: { bg: '#ffffff', text: '#1f2937', label: '明亮' },
  sepia: { bg: '#f6ecd8', text: '#5b4636', label: '羊皮纸' },
  green: { bg: '#e8f5e9', text: '#2e4a34', label: '护眼' },
  dark: { bg: '#1a1a1a', text: '#d1d5db', label: '夜间' },
};

const SETTINGS_KEY = 'mm_reader_settings';
const PROGRESS_KEY = 'mm_reader_progress';

export default function BookReaderPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
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

  const toggleFavoriteChapter = async () => {
    if (!currentChapter) return;
    const res = await addFavoriteService({ bookId: Number(bookId), chapterId: currentChapter.id });
    if (res.code === 200) toast.success('已收藏本章');
    else toast.info('当前章节已在收藏中');
  };

  const theme = THEMES[settings.theme];

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        bgcolor: theme.bg,
        color: theme.text,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {/* 顶部栏 */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: theme.bg,
          borderBottom: '1px solid rgba(128,128,128,.18)',
        }}
      >
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()} sx={{ color: theme.text }}>
          返回
        </Button>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }} noWrap>
          {book?.bookName || book?.title || '阅读'}
        </Typography>
        <Tooltip title="收藏本章">
          <span>
            <IconButton onClick={toggleFavoriteChapter} disabled={!currentChapter} sx={{ color: theme.text }}>
              <StarBorderRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="阅读设置">
          <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: theme.text }}>
            <SettingsRoundedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="目录">
          <IconButton onClick={() => setSidebarOpen(true)} sx={{ color: theme.text }}>
            <MenuBookRoundedIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 内容 */}
      <Box
        ref={contentRef}
        sx={{ px: { xs: 2, md: 4 }, py: 4, mx: 'auto', maxWidth: settings.width }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Button
            disabled={!prevChapter}
            startIcon={<ArrowBackIosNewRoundedIcon />}
            onClick={() => prevChapter && loadChapter(prevChapter)}
            sx={{ color: theme.text }}
          >
            上一章
          </Button>
          <Typography variant="h6" fontWeight={700} sx={{ textAlign: 'center', flex: 1 }} noWrap>
            {currentChapter?.chapterTitle || '加载中…'}
          </Typography>
          <Button
            disabled={!nextChapter}
            endIcon={<ArrowForwardIosRoundedIcon />}
            onClick={() => nextChapter && loadChapter(nextChapter)}
            sx={{ color: theme.text }}
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
          <Stack alignItems="center" spacing={1} sx={{ py: 8, opacity: 0.6 }}>
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
                  color: theme.text,
                }}
              >
                {p}
              </Typography>
            ))}
            <Divider sx={{ my: 4 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button disabled={!prevChapter} startIcon={<ArrowBackIosNewRoundedIcon />} onClick={() => prevChapter && loadChapter(prevChapter)} sx={{ color: theme.text }}>
                上一章
              </Button>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                {currentChapter?.chapterTitle}
              </Typography>
              <Button disabled={!nextChapter} endIcon={<ArrowForwardIosRoundedIcon />} onClick={() => nextChapter && loadChapter(nextChapter)} sx={{ color: theme.text }}>
                下一章
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      {/* 目录抽屉 */}
      <Drawer anchor="left" open={sidebarOpen} onClose={() => setSidebarOpen(false)} slotProps={{ paper: { sx: { width: 340 } } }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={700}>
              目录
            </Typography>
            <IconButton onClick={() => setSidebarOpen(false)}>
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
        <List sx={{ px: 1.5 }}>
          {filteredChapters.map((c) => (
            <ListItemButton
              key={String(c.id)}
              selected={c.id === currentChapter?.id}
              onClick={() => loadChapter(c)}
              sx={{ borderRadius: 2.5, mb: 0.5 }}
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
      <Drawer anchor="right" open={settingsOpen} onClose={() => setSettingsOpen(false)} slotProps={{ paper: { sx: { width: 320, p: 3 } } }}>
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
              主题
            </Typography>
            <Stack direction="row" spacing={1.5}>
              {(Object.keys(THEMES) as Array<ReaderSettings['theme']>).map((key) => (
                <Tooltip key={key} title={THEMES[key].label}>
                  <Button
                    onClick={() => saveSettings({ theme: key })}
                    sx={{
                      minWidth: 56,
                      height: 56,
                      bgcolor: THEMES[key].bg,
                      color: THEMES[key].text,
                      border: 2,
                      borderColor: settings.theme === key ? 'primary.main' : 'transparent',
                      '&:hover': { bgcolor: THEMES[key].bg },
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
