'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { toast } from '@/lib/notify';
import { getReadingProgress, saveReadingProgress } from '@/lib/readingProgress';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { pushRecent } from '@/lib/recent';
import {
  ANNOTATION_COLORS,
  addAnnotation,
  getAnnotations,
  removeAnnotationsInRange,
  type AnnotationColor,
  type ReaderAnnotation,
} from '@/lib/readerAnnotations';
import { analyzeTextService, type TextAnalysisResult } from '@/api/agent';
import AgentAnalysisDialog from '@/components/common/AgentAnalysisDialog';
import ReaderSelectionToolbar from '@/components/reader/ReaderSelectionToolbar';
import AddToListDialog from '@/components/lists/AddToListDialog';
import type { MediaListSummary } from '@/components/lists/MediaListPanel';
import { useAuthStore } from '@/stores/authStore';
import BookFileReader from '@/components/user/BookFileReader';
import {
  getBookByIdService,
  getAllChaptersService,
  getChapterContentService,
  getBookListsService,
  getBookListMembershipService,
  addBookToListService,
  type BookList,
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

interface ReaderTextSelection {
  top: number;
  left: number;
  start: number;
  end: number;
  text: string;
}

/** 从选区端点向上找段落下标；无论端点在文本节点还是嵌套 span 里都能命中 */
function paragraphElement(node: Node | null): HTMLElement | null {
  if (!node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return (element?.closest('[data-reader-p]') as HTMLElement | null) ?? null;
}

/** 区间端点在一段文字里的字符偏移 */
function offsetInside(element: HTMLElement, container: Node, offset: number): number {
  const pre = document.createRange();
  pre.selectNodeContents(element);
  pre.setEnd(container, offset);
  return pre.toString().length;
}

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

  // 加入书单（阅读器里的收藏按钮不再直接收藏本章）
  const [bookLists, setBookLists] = useState<BookList[]>([]);
  const [inAnyList, setInAnyList] = useState(false);
  const [addToListOpen, setAddToListOpen] = useState(false);

  // 划线与笔记（localStorage，按章节隔离）
  const [annotations, setAnnotations] = useState<ReaderAnnotation[]>([]);
  const [selection, setSelection] = useState<ReaderTextSelection | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteTarget, setNoteTarget] = useState<ReaderTextSelection | null>(null);

  // Agent 选段分析
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TextAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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
      // 保存阅读进度（图书页据此显示「继续阅读」）
      saveReadingProgress(bookId, {
        chapterId: chapter.id,
        chapterTitle: chapter.chapterTitle ?? undefined,
        mode: 'chapter',
      });
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

        // 上传的 EPUB / PDF / CBZ 默认走文件阅读器（它自己负责续读）。
        // 这里**必须提前返回**，否则下面的章节自动加载会把进度覆盖成「章节模式」，
        // 文件阅读器再读时就只剩 chapterId、没有 chapterIndex，于是每次从头开始。
        const fmt = ((bookData.fileFormat as string) || '').toLowerCase();
        const fileBacked = fmt === 'epub' || fmt === 'pdf' || fmt === 'cbz';
        if (fileBacked && !queryChapter) {
          setLoading(false);
          return;
        }

        let target: Chapter | undefined;
        if (queryChapter) target = chapterList.find((c) => String(c.id) === queryChapter);
        if (!target) {
          const progress = getReadingProgress(bookId);
          if (progress?.chapterId != null) {
            target = chapterList.find((c) => String(c.id) === String(progress.chapterId));
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

  /** 标注按「书 + 章节」隔离；切章后重新读取本地记录 */
  const annotationKey = currentChapter?.id != null ? `${bookId}:chapter:${currentChapter.id}` : '';

  useEffect(() => {
    setAnnotations(annotationKey ? getAnnotations(annotationKey) : []);
    setSelection(null);
  }, [annotationKey]);

  /** 每个段落在整章纯文本里的起始下标（段落之间按一个换行计算） */
  const paragraphStarts = useMemo(() => {
    let offset = 0;
    return paragraphs.map((p) => {
      const start = offset;
      offset += p.length + 1;
      return start;
    });
  }, [paragraphs]);

  const fullText = useMemo(() => paragraphs.join('\n'), [paragraphs]);

  /** 根据浏览器选区计算整章字符区间，并把工具条定位到选区下方 */
  const captureSelection = useCallback(() => {
    const root = contentRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const startEl = paragraphElement(range.startContainer);
    const endEl = paragraphElement(range.endContainer);
    if (!startEl || !endEl) {
      setSelection(null);
      return;
    }

    const startP = Number(startEl.getAttribute('data-reader-p'));
    const endP = Number(endEl.getAttribute('data-reader-p'));
    if (!Number.isFinite(startP) || !Number.isFinite(endP)) {
      setSelection(null);
      return;
    }

    const start = (paragraphStarts[startP] ?? 0) + offsetInside(startEl, range.startContainer, range.startOffset);
    const end = (paragraphStarts[endP] ?? 0) + offsetInside(endEl, range.endContainer, range.endOffset);
    const text = fullText.slice(start, end);
    if (end <= start || !text.trim()) {
      setSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const half = 195;
    const left = Math.min(Math.max(16 + half, rect.left + rect.width / 2), window.innerWidth - 16 - half);
    const top = rect.bottom + 10 > window.innerHeight - 72 ? rect.top - 58 : rect.bottom + 10;
    setSelection({ top, left, start, end, text });
  }, [fullText, paragraphStarts]);

  // 点工具条以外的地方收起；工具条自身会阻止 mousedown 默认行为
  useEffect(() => {
    if (!selection) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-reader-toolbar]')) return;
      setSelection(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [selection]);

  const applyAnnotationColor = (color: AnnotationColor) => {
    if (!selection || !annotationKey) return;
    setAnnotations(
      addAnnotation(annotationKey, {
        start: selection.start,
        end: selection.end,
        quote: selection.text,
        color,
      }),
    );
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const openNoteDialog = () => {
    if (!selection) return;
    setNoteTarget(selection);
    setNoteDraft('');
    setNoteOpen(true);
    setSelection(null);
  };

  const saveNote = () => {
    if (!noteTarget || !annotationKey || !noteDraft.trim()) {
      toast.info('请输入笔记内容');
      return;
    }
    setAnnotations(
      addAnnotation(annotationKey, {
        start: noteTarget.start,
        end: noteTarget.end,
        quote: noteTarget.text,
        note: noteDraft.trim(),
      }),
    );
    setNoteOpen(false);
    setNoteTarget(null);
    setNoteDraft('');
    toast.success('笔记已添加');
  };

  const analyzeSelection = async () => {
    if (!selection) return;
    const target = selection;
    setSelection(null);
    setAnalysisOpen(true);
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
      const res = await analyzeTextService({
        kind: 'passage',
        title: book?.bookName || book?.title,
        context: currentChapter?.chapterTitle,
        text: target.text,
      });
      setAnalysisResult(res.data);
    } catch (e) {
      setAnalysisError((e as { message?: string })?.message || '分析失败，请稍后重试');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const clearSelectionAnnotations = () => {
    if (!selection || !annotationKey) return;
    setAnnotations(removeAnnotationsInRange(annotationKey, selection.start, selection.end));
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    toast.success('已清除选区内的标记');
  };

  /** 把一段正文按标注边界切成 span；笔记用波浪线，颜色用背景 */
  const renderParagraph = (text: string, index: number) => {
    const pStart = paragraphStarts[index] ?? 0;
    const pEnd = pStart + text.length;
    const relevant = annotations.filter((a) => a.start < pEnd && a.end > pStart);
    if (relevant.length === 0) return text;

    const points = Array.from(
      new Set([
        0,
        text.length,
        ...relevant.flatMap((a) => [
          Math.max(0, Math.min(text.length, a.start - pStart)),
          Math.max(0, Math.min(text.length, a.end - pStart)),
        ]),
      ]),
    ).sort((a, b) => a - b);

    const nodes: ReactNode[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      if (from >= to) continue;
      const active = relevant.filter((a) => a.start < pStart + to && a.end > pStart + from);
      if (active.length === 0) {
        nodes.push(text.slice(from, to));
        continue;
      }

      const color = active.find((a) => a.color)?.color;
      const note = active.find((a) => a.note)?.note;
      const sx = {
        backgroundColor: color ? ANNOTATION_COLORS[color].css : undefined,
        textDecoration: note ? 'underline wavy var(--mm-accent-text)' : undefined,
        textDecorationThickness: note ? '2px' : undefined,
        textUnderlineOffset: note ? '4px' : undefined,
        cursor: note ? 'help' : 'inherit',
      };
      const span = (
        <Box component="span" key={`${index}-${from}-${to}`} sx={sx}>
          {text.slice(from, to)}
        </Box>
      );
      nodes.push(
        note ? (
          <Tooltip key={`note-${index}-${from}-${to}`} title={note} arrow>
            {span}
          </Tooltip>
        ) : (
          span
        ),
      );
    }
    return nodes;
  };

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

  const loadListState = useCallback(async () => {
    if (!bookId) return;
    try {
      const [listsRes, membershipRes] = await Promise.all([
        getBookListsService(),
        getBookListMembershipService(),
      ]);
      setBookLists((listsRes.data as BookList[]) || []);
      setInAnyList(((membershipRes.data || {})[String(bookId)]?.length ?? 0) > 0);
    } catch {
      /* ignore */
    }
  }, [bookId]);

  useEffect(() => {
    loadListState();
  }, [loadListState]);

  const addToBookList = async (listId: number) => {
    try {
      const res = await addBookToListService(listId, bookId);
      if (res.code === 200) {
        toast.success('已加入书单');
        await loadListState();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const listSummaries = useMemo<MediaListSummary[]>(
    () =>
      bookLists
        .filter((list) => list.id != null)
        .map((list) => ({
          id: Number(list.id),
          name: list.name,
          description: list.description,
          count: Number(list.bookCount ?? 0),
        })),
    [bookLists],
  );

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

  // 用户上传的文件（EPUB / PDF / CBZ）默认走专用阅读器；
  // 但从详情点「阅读本章」带了 chapterId 时，走章节正文（指针章节也能读）。
  const fileFormat = (book?.fileFormat || '').toLowerCase();
  const requestedChapterId = search?.get('chapterId');
  if (
    book &&
    !requestedChapterId &&
    (fileFormat === 'epub' || fileFormat === 'pdf' || fileFormat === 'cbz')
  ) {
    return <BookFileReader book={book} />;
  }

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
          <Tooltip title={inAnyList ? '已在书单中，点击加入其他书单' : '加入书单'}>
            <span>
              <IconButton onClick={() => setAddToListOpen(true)} aria-label="加入书单">
                {inAnyList ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
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
        onMouseUp={() => window.setTimeout(captureSelection, 0)}
        onKeyUp={() => window.setTimeout(captureSelection, 0)}
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
                data-reader-p={i}
                sx={{
                  fontSize: settings.fontSize,
                  lineHeight: settings.lineHeight,
                  mb: 2,
                  textIndent: '2em',
                }}
              >
                {renderParagraph(p, i)}
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

      {annotations.some((a) => a.note) && (
        <Card sx={{ mt: 2, p: 2.5, borderRadius: 'var(--mm-radius-lg)' }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
            本章笔记
          </Typography>
          <Stack spacing={1.5}>
            {annotations
              .filter((a) => a.note)
              .map((a) => (
                <Box key={a.id}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    “{a.quote}”
                  </Typography>
                  <Typography variant="body2">{a.note}</Typography>
                </Box>
              ))}
          </Stack>
        </Card>
      )}

      {selection && (
        <ReaderSelectionToolbar
          menu={{ top: selection.top, left: selection.left }}
          onColor={applyAnnotationColor}
          onNote={openNoteDialog}
          onAnalyze={analyzeSelection}
          onClear={clearSelectionAnnotations}
        />
      )}

      {/* 添加笔记：笔记保存后用波浪线标在原文下方 */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>添加笔记</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              p: 1.5,
              mb: 2,
              bgcolor: 'var(--mm-sunken)',
              boxShadow: 'var(--mm-sunken-sm)',
              maxHeight: 140,
              overflowY: 'auto',
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {noteTarget?.text}
            </Typography>
          </Box>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            label="笔记"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNoteOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveNote}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <AgentAnalysisDialog
        open={analysisOpen}
        title={`内容分析 · ${currentChapter?.chapterTitle || '选段'}`}
        loading={analysisLoading}
        result={analysisResult}
        error={analysisError}
        onClose={() => setAnalysisOpen(false)}
      />

      <AddToListDialog
        open={addToListOpen}
        title="加入书单"
        itemTitle={book?.bookName || book?.title}
        lists={listSummaries}
        unit="本"
        icon={<LibraryBooksRoundedIcon />}
        onAdd={addToBookList}
        onClose={() => setAddToListOpen(false)}
        onCreate={() => {
          setAddToListOpen(false);
          router.push('/content/book');
        }}
      />

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
