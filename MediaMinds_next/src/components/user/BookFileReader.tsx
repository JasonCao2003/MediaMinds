'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Slider,
  Stack,
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
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmptyState from '@/components/common/EmptyState';
import { getReadingProgress, saveReadingProgress } from '@/lib/readingProgress';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import {
  getEpubManifestService,
  getEpubResourceTextService,
  getEpubResourceBlobService,
  getCbzManifestService,
  getCbzPageService,
  getBookRawFileService,
  type EpubChapterInfo,
} from '@/api/book';
import type { Book } from '@/types';

type ReaderThemeKey = 'light' | 'sepia' | 'green' | 'dark';

interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  theme: ReaderThemeKey;
}

const SETTINGS_KEY = 'mm_reader_settings';

const THEME_LABELS: Record<ReaderThemeKey, string> = {
  light: '明亮',
  sepia: '羊皮纸',
  green: '护眼',
  dark: '夜间',
};

const DEFAULT_SETTINGS: ReaderSettings = { fontSize: 18, lineHeight: 1.8, theme: 'light' };

/** 渲染章节用的基础样式：底色 / 字号 / 行距都跟随阅读设置与令牌 */
function readerCss(settings: ReaderSettings, bg: string, fg: string, accent: string): string {
  return `
    html, body { margin: 0; padding: 0; background: ${bg}; color: ${fg}; }
    body {
      padding: 28px 32px 64px;
      font-size: ${settings.fontSize}px;
      line-height: ${settings.lineHeight};
      word-break: break-word;
    }
    img, svg, video, table { max-width: 100%; height: auto; }
    a { color: ${accent}; }
    h1, h2, h3, h4 { line-height: 1.4; }
    p { margin: 0 0 1em; }
  `;
}

/** 取某个元素的引用地址属性名（SVG 的 image 用 href / xlink:href） */
function refAttr(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  if (tag === 'link') return 'href';
  if (tag === 'image') return el.hasAttribute('xlink:href') ? 'xlink:href' : 'href';
  if (tag === 'source' || tag === 'iframe' || tag === 'audio' || tag === 'video') return 'src';
  return el.hasAttribute('src') ? 'src' : null;
}

/** href 相对章节路径解析成 ZIP entry 名；外链 / data: / 纯锚点返回 null */
function resolveEntryPath(baseDir: string, href: string): string | null {
  const clean = href.split('#')[0].split('?')[0].trim();
  if (!clean) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(clean) || clean.startsWith('//')) return null;
  const stack = baseDir ? baseDir.split('/').filter(Boolean) : [];
  for (const part of clean.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  const joined = stack.join('/');
  try {
    return decodeURIComponent(joined);
  } catch {
    return joined;
  }
}

/**
 * 阅读一个**用户上传的文件**（阶段 R）。
 *
 * <p>EPUB / CBZ 不走「原文件交给浏览器端库」的方案，而是服务端解包后按资源取：
 * 章节正文按文本取回、图片 CSS 字体按 Blob 取回再用 objectURL 内联。
 * 这些二进制请求都带 Authorization，因此**不能直接把后端 URL 塞进 iframe / img**。
 */
export default function BookFileReader({ book }: { book: Book }) {
  const router = useRouter();
  const { mm } = useTheme();
  const format = (book.fileFormat || '').toLowerCase();

  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings((prev) => ({ ...prev, ...(JSON.parse(raw) as Partial<ReaderSettings>) }));
    } catch {
      /* ignore */
    }
  }, []);

  const saveSettings = (next: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...existing, ...merged }));
      } catch {
        /* ignore */
      }
      return merged;
    });
  };

  const THEMES = useMemo<Record<ReaderThemeKey, { bg: string; fg: string }>>(
    () => ({
      light: { bg: mm.bg, fg: mm.text },
      sepia: { bg: alpha(mm.warning, 0.18), fg: mm.text },
      green: { bg: alpha(mm.success, 0.18), fg: mm.text },
      dark: { bg: mm.text, fg: mm.bg },
    }),
    [mm],
  );
  const readerTheme = THEMES[settings.theme];

  return (
    <Box>
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
            {book.bookName || book.title || '阅读'}
          </Typography>
          {format === 'epub' && (
            <Tooltip title="阅读设置">
              <IconButton onClick={() => setSettingsOpen(true)} aria-label="阅读设置">
                <SettingsRoundedIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Card>

      {format === 'pdf' ? (
        <PdfReader book={book} />
      ) : format === 'epub' ? (
        <EpubReader book={book} settings={settings} theme={readerTheme} />
      ) : format === 'cbz' ? (
        <CbzReader book={book} />
      ) : (
        <EmptyState icon={<MenuBookRoundedIcon />} title="暂不支持在线阅读该格式" minHeight={240} />
      )}

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
                      color: THEMES[key].fg,
                      bgcolor: THEMES[key].bg,
                      boxShadow: settings.theme === key ? '0 0 0 4px var(--mm-accent)' : 'var(--mm-raised-sm)',
                      '&:hover': {
                        bgcolor: THEMES[key].bg,
                        color: THEMES[key].fg,
                        boxShadow: '0 0 0 4px var(--mm-accent)',
                      },
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

// ============================================================
// PDF：带鉴权取 Blob → objectURL → 浏览器原生查看器
// ============================================================

function PdfReader({ book }: { book: Book }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const blob = await getBookRawFileService(book.id!);
        if (cancelled || !(blob instanceof Blob)) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        /* 拦截器已提示 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [book.id]);

  useActivityTracker('book', !loading && Boolean(url));

  if (loading) {
    return <EmptyState icon={<CircularProgress size={36} />} title="正在加载 PDF…" minHeight={320} />;
  }
  if (!url) {
    return <EmptyState icon={<MenuBookRoundedIcon />} title="PDF 加载失败" minHeight={320} />;
  }
  return (
    <Box sx={{ boxShadow: 'var(--mm-sunken-sm)', bgcolor: 'var(--mm-sunken)' }}>
      <Box component="iframe" src={url} title={book.bookName || 'PDF'} sx={{ width: '100%', height: '80vh', border: 0, display: 'block' }} />
    </Box>
  );
}

// ============================================================
// EPUB：目录 + 章节正文（内联资源）
// ============================================================

function EpubReader({
  book,
  settings,
  theme,
}: {
  book: Book;
  settings: ReaderSettings;
  theme: { bg: string; fg: string };
}) {
  const { mm } = useTheme();
  const [chapters, setChapters] = useState<EpubChapterInfo[]>([]);
  const [current, setCurrent] = useState(0);
  const [headHtml, setHeadHtml] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  const revokeBlobs = useCallback(() => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
  }, []);

  // 卸载时释放当前章节内联出来的 objectURL
  useEffect(() => () => revokeBlobs(), [revokeBlobs]);

  const loadChapter = useCallback(
    async (chapter: EpubChapterInfo, index: number) => {
      setLoading(true);
      revokeBlobs();
      setHeadHtml('');
      setBodyHtml('');
      // 记进度：图书页据此显示「继续阅读」，下次从这里接着读
      saveReadingProgress(book.id!, {
        chapterIndex: index,
        chapterTitle: chapter.title ?? undefined,
        mode: 'file',
      });
      try {
        const text = await getEpubResourceTextService(book.id!, chapter.path);
        if (typeof text !== 'string' || !text) {
          throw new Error('empty');
        }
        const doc = new DOMParser().parseFromString(text, 'text/html');

        // 去掉脚本 / 内联事件，资源引用改成 objectURL
        doc.querySelectorAll('script, noscript').forEach((node) => node.remove());
        const baseDir = chapter.path.includes('/') ? chapter.path.slice(0, chapter.path.lastIndexOf('/')) : '';
        const tasks: Promise<void>[] = [];
        doc.querySelectorAll('img, image, link, source, audio, video').forEach((el) => {
          const attr = refAttr(el);
          if (attr) {
            const value = el.getAttribute(attr);
            if (value) {
              const tag = el.tagName.toLowerCase();
              const isStylesheet = tag === 'link' && (el.getAttribute('rel') || '').toLowerCase().includes('stylesheet');
              const entry = resolveEntryPath(baseDir, value);
              if (entry && (isStylesheet || tag !== 'link')) {
                tasks.push(
                  (async () => {
                    try {
                      const blob = await getEpubResourceBlobService(book.id!, entry);
                      if (!(blob instanceof Blob)) return;
                      const url = URL.createObjectURL(blob);
                      blobUrlsRef.current.push(url);
                      el.setAttribute(attr, url);
                      if (tag === 'image') el.setAttribute('href', url);
                    } catch {
                      /* 单个资源失败不影响正文渲染 */
                    }
                  })(),
                );
              }
            }
          }
        });
        await Promise.all(tasks);

        // 内联事件与 javascript: 链接兜底清理
        doc.querySelectorAll('*').forEach((el) => {
          for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on')) {
              el.removeAttribute(attr.name);
            } else if ((name === 'href' || name === 'src') && attr.value.trim().toLowerCase().startsWith('javascript:')) {
              el.removeAttribute(attr.name);
            }
          }
        });

        setHeadHtml(doc.head ? doc.head.innerHTML : '');
        setBodyHtml(doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML);
      } catch {
        setBodyHtml('');
      } finally {
        setLoading(false);
      }
    },
    [book.id, revokeBlobs],
  );

  // 拉目录
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getEpubManifestService(book.id!);
        const list = res.data?.chapters ?? [];
        if (cancelled || list.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }
        setChapters(list);
        const saved = getReadingProgress(book.id!);
        const startIndex =
          saved?.chapterIndex != null
            ? Math.min(Math.max(0, saved.chapterIndex), list.length - 1)
            : 0;
        setCurrent(startIndex);
        void loadChapter(list[startIndex], startIndex);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book.id, loadChapter]);

  useActivityTracker('book', !loading && bodyHtml.length > 0);

  const html = useMemo(() => {
    if (!bodyHtml) return '';
    const css = readerCss(settings, theme.bg, theme.fg, mm.accentText);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style>${headHtml}</head><body>${bodyHtml}</body></html>`;
  }, [bodyHtml, headHtml, settings, theme, mm.accentText]);

  const pick = (index: number) => {
    setCurrent(index);
    setTocOpen(false);
    if (chapters[index]) void loadChapter(chapters[index], index);
  };

  const hasChapter = chapters.length > 0;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          disabled={!hasChapter || current <= 0}
          startIcon={<ArrowBackIosNewRoundedIcon />}
          onClick={() => pick(current - 1)}
        >
          上一章
        </Button>
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1, minWidth: 0, textAlign: 'center' }} noWrap>
          {chapters[current]?.title || book.bookName || ''}
        </Typography>
        <Button
          variant="outlined"
          disabled={!hasChapter || current >= chapters.length - 1}
          endIcon={<ArrowForwardIosRoundedIcon />}
          onClick={() => pick(current + 1)}
        >
          下一章
        </Button>
        <Tooltip title="目录">
          <span>
            <IconButton onClick={() => setTocOpen(true)} disabled={!hasChapter} aria-label="目录">
              <MenuBookRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {loading ? (
        <EmptyState icon={<CircularProgress size={36} />} title="正在加载章节…" minHeight={320} />
      ) : !bodyHtml ? (
        <EmptyState icon={<MenuBookRoundedIcon />} title="本章内容为空" minHeight={320} />
      ) : (
        <Box sx={{ boxShadow: 'var(--mm-sunken-sm)', bgcolor: theme.bg }}>
          <Box
            component="iframe"
            title={chapters[current]?.title || book.bookName || 'EPUB'}
            srcDoc={html}
            sandbox="allow-same-origin"
            sx={{ width: '100%', height: '78vh', border: 0, display: 'block', bgcolor: theme.bg }}
          />
        </Box>
      )}

      <Drawer
        anchor="left"
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        slotProps={{ paper: { sx: { width: 340, bgcolor: 'var(--mm-bg)' } } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={700}>
              目录
            </Typography>
            <IconButton onClick={() => setTocOpen(false)} aria-label="关闭目录">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>
        <Divider />
        <List sx={{ px: 1.5, pb: 2 }}>
          {chapters.map((c, i) => (
            <ListItemButton
              key={`${c.index}-${c.path}`}
              selected={i === current}
              onClick={() => pick(i)}
              sx={{ borderRadius: 'var(--mm-radius)', mb: 0.5 }}
            >
              <ListItemText primary={c.title || `第 ${i + 1} 章`} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </Box>
  );
}

// ============================================================
// CBZ：逐页出图
// ============================================================

function CbzReader({ book }: { book: Book }) {
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getCbzManifestService(book.id!);
        if (cancelled) return;
        const total = res.data?.pageCount ?? 0;
        setPageCount(total);
        const saved = getReadingProgress(book.id!);
        if (saved?.page != null && total > 0) {
          setPage(Math.min(Math.max(0, saved.page), total - 1));
        }
      } catch {
        /* 拦截器已提示 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book.id]);

  useEffect(() => {
    if (pageCount <= 0) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    (async () => {
      try {
        const blob = await getCbzPageService(book.id!, page);
        if (cancelled || !(blob instanceof Blob)) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        saveReadingProgress(book.id!, { page, mode: 'file' });
      } catch {
        /* 拦截器已提示 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setUrl((prev) => (prev === objectUrl ? null : prev));
      }
    };
  }, [book.id, page, pageCount]);

  useActivityTracker('book', !loading && Boolean(url));

  if (pageCount <= 0 && !loading) {
    return <EmptyState icon={<MenuBookRoundedIcon />} title="压缩包里没有找到图片" minHeight={320} />;
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          disabled={page <= 0}
          startIcon={<ArrowBackIosNewRoundedIcon />}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          上一页
        </Button>
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1, textAlign: 'center' }}>
          {pageCount > 0 ? `第 ${page + 1} / ${pageCount} 页` : '加载中…'}
        </Typography>
        <Button
          variant="outlined"
          disabled={pageCount <= 0 || page >= pageCount - 1}
          endIcon={<ArrowForwardIosRoundedIcon />}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        >
          下一页
        </Button>
      </Stack>

      {loading ? (
        <EmptyState icon={<CircularProgress size={36} />} title="正在加载页面…" minHeight={320} />
      ) : url ? (
        <Box sx={{ textAlign: 'center', bgcolor: 'var(--mm-sunken)', boxShadow: 'var(--mm-sunken-sm)', p: 2 }}>
          <Box
            component="img"
            src={url}
            alt={`第 ${page + 1} 页`}
            sx={{ maxWidth: '100%', maxHeight: '78vh', display: 'inline-block' }}
          />
        </Box>
      ) : (
        <EmptyState icon={<MenuBookRoundedIcon />} title="该页加载失败" minHeight={320} />
      )}
    </Box>
  );
}
