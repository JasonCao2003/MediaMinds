'use client';

import { Children, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
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
  useTheme,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import MoveToInboxRoundedIcon from '@mui/icons-material/MoveToInboxRounded';
import SaveAltRoundedIcon from '@mui/icons-material/SaveAltRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { useConfirm } from '@/components/common/ConfirmProvider';
import OnlineBooksPanel from '@/components/user/OnlineBooksPanel';
import OnlineMetadataDialog from '@/components/user/OnlineMetadataDialog';
import BookMetadataMergeDialog from '@/components/user/BookMetadataMergeDialog';
import { getRecent, relativeTime, removeRecent, type RecentItem } from '@/lib/recent';
import { getReadingProgress } from '@/lib/readingProgress';
import { humanFileSize, sourceLabel } from '@/lib/format';
import { normalizeDateInput, onlineMetadataPatch, type OnlineBookSummary } from '@/lib/onlineBook';
import { toast } from '@/lib/notify';
import { normalizePage } from '@/lib/page';
import {
  getBookListService,
  getBookByIdService,
  setBookMetadataLockService,
  refreshBookMetadataService,
  scanBookDropService,
  writeBackBookFileService,
  rebuildBookChaptersService,
  getSupportedBookFormatsService,
  stageBookFileService,
  getStagingCoverService,
  discardStagingService,
  importBookWithFileService,
  deleteBookFileService,
  getBookRawFileService,
  type BookSortField,
  type StagingResult,
  searchBookService,
  getAllTypesService,
  getAllChaptersService,
  getBookListsService,
  createBookListService,
  updateBookListService,
  deleteBookListService,
  getBookListItemsService,
  addBookToListService,
  removeBookFromListService,
  getBookListMembershipService,
  type BookList,
  addBookService,
  updateBookService,
  deleteBookService,
  updateBookCoverService,
  addTypeService,
  updateTypeService,
  addChapterService,
  updateChapterService,
  deleteChapterService,
} from '@/api/book';
import FormDialog, { type FormField } from '@/components/manage/FormDialog';
import DimensionDialog, { type DimensionItem } from '@/components/manage/DimensionDialog';
import { useCrud } from '@/components/manage/useCrud';
import MediaListPanel, { type MediaListSummary } from '@/components/lists/MediaListPanel';
import AddToListDialog from '@/components/lists/AddToListDialog';
import ListItemsDialog, { type MediaListItem } from '@/components/lists/ListItemsDialog';
import type { Book, BookType, Chapter } from '@/types';

type BookView = 'recent' | 'lists' | 'all' | 'online';

interface BookItem {
  id: number;
  title: string;
  author: string;
  cover?: string;
  description?: string;
  typeId?: number;
  chapterCount?: number;
  source?: string;
  isFavorite?: boolean;

  // 出版元数据
  subtitle?: string;
  publisher?: string;
  publishedDate?: string;
  isbn13?: string;
  isbn10?: string;
  pageCount?: number;
  language?: string;
  seriesName?: string;
  seriesNumber?: number | string;

  // 上传的图书文件
  hasFile?: boolean;
  fileFormat?: string;
  fileName?: string;
  fileSize?: number;

  /** 元数据锁定（阶段 6） */
  metadataLocked?: boolean;
}

const PAGE_SIZE = 12;

/** 需要按数字提交的表单字段（后端是 Integer / BigDecimal） */
const BOOK_NUMBER_FIELDS = ['typeId', 'pageCount', 'seriesNumber'] as const;

/**
 * 表单值 → 后端 Book 请求体。
 *
 * <p>空串一律删掉：可选字段留空应写 NULL，而不是把 `''` 写进库；
 * `published_date` 是 LocalDate，传空串会直接反序列化失败。
 */
function normalizeBookPayload(values: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...values };
  for (const key of Object.keys(payload)) {
    const value = payload[key];
    if (value === '' || value === null || value === undefined) {
      delete payload[key];
    }
  }
  for (const key of BOOK_NUMBER_FIELDS) {
    if (payload[key] === undefined) continue;
    const n = Number(payload[key]);
    if (Number.isFinite(n)) payload[key] = n;
    else delete payload[key];
  }
  if (payload.publishedDate !== undefined) {
    const date = normalizeDateInput(payload.publishedDate);
    if (date) payload.publishedDate = date;
    else delete payload.publishedDate;
  }
  return payload;
}

/** 编辑时把列表项映射回表单字段（字段名与 `bookFields` 一致） */
function bookToFormValues(book: BookItem): Record<string, unknown> {
  return {
    bookName: book.title,
    subtitle: book.subtitle ?? '',
    bookAuthor: book.author,
    typeId: book.typeId ?? '',
    publisher: book.publisher ?? '',
    publishedDate: book.publishedDate ?? '',
    isbn13: book.isbn13 ?? '',
    isbn10: book.isbn10 ?? '',
    pageCount: book.pageCount ?? '',
    language: book.language ?? '',
    seriesName: book.seriesName ?? '',
    seriesNumber: book.seriesNumber ?? '',
    bookDetails: book.description ?? '',
    bookImg: book.cover ?? '',
  };
}

/** 「最近阅读」只取一页（12 条），不分页 */
const RECENT_SIZE = 12;

/** 书库排序：只保留添加顺序（默认最新在最上） */
type BookSortKey = 'createTime-desc' | 'createTime-asc';

const SORT_OPTIONS: { value: BookSortKey; label: string }[] = [
  { value: 'createTime-desc', label: '最近添加' },
  { value: 'createTime-asc', label: '最早添加' },
];

/** 图书表单字段（新建 / 编辑 / 上传预填共用） */
const bookFields = (types: BookType[]): FormField[] => [
  { name: 'bookName', label: '书名', required: true, maxLength: 255 },
  { name: 'subtitle', label: '副标题', maxLength: 255 },
  { name: 'bookAuthor', label: '作者', maxLength: 255 },
  {
    name: 'typeId',
    label: '类型',
    type: 'select',
    options: types
      .filter((t) => t.id != null)
      .map((t) => ({ label: t.typeName || '未命名', value: t.id as number })),
  },
  { name: 'publisher', label: '出版社', maxLength: 255 },
  { name: 'publishedDate', label: '出版日期', helperText: 'yyyy-MM-dd；只填年份也可以' },
  { name: 'isbn13', label: 'ISBN-13', maxLength: 13 },
  { name: 'isbn10', label: 'ISBN-10', maxLength: 10 },
  { name: 'pageCount', label: '页数', type: 'number' },
  { name: 'language', label: '语言', maxLength: 16 },
  { name: 'seriesName', label: '丛书名', maxLength: 255 },
  { name: 'seriesNumber', label: '丛书序号', type: 'number' },
  { name: 'bookDetails', label: '简介', type: 'textarea', rows: 4 },
  { name: 'bookImg', label: '封面', type: 'image', accept: 'image/*' },
];

/** 上传图书文件的表单：在图书字段后追加「同时生成章节」开关 */
const stagingBookFields = (types: BookType[]): FormField[] => [
  ...bookFields(types),
  {
    name: 'generateChapters',
    label: '同时生成章节（EPUB / PDF，只写指针不复制正文）',
    type: 'switch',
  },
];

/** 图书类型表单字段 */
const TYPE_FIELDS: FormField[] = [{ name: 'typeName', label: '类型名', required: true, maxLength: 50 }];

/** 书单表单字段 */
const LIST_FIELDS: FormField[] = [
  { name: 'name', label: '书单名', required: true, maxLength: 100 },
  { name: 'description', label: '描述', maxLength: 500 },
];

/**
 * 章节表单字段。
 * `book_chapter.content_path` 是 NOT NULL，且后端没有正文上传端点，
 * 所以这里只能手填路径；填了才能建出章节。
 */
const CHAPTER_FIELDS: FormField[] = [
  { name: 'chapterNumber', label: '章节序号', type: 'number' },
  { name: 'chapterTitle', label: '章节标题', required: true, maxLength: 255 },
  { name: 'contentPath', label: '正文路径', required: true, maxLength: 255 },
  { name: 'wordCount', label: '字数', type: 'number' },
];

export default function BookViewPage() {
  const router = useRouter();
  const { mm } = useTheme();
  const confirm = useConfirm();
  const [refreshing, setRefreshing] = useState(false);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [types, setTypes] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [view, setView] = useState<BookView>('recent');

  /** 库的排序：默认按添加顺序（最新在最上） */
  const [sortKey, setSortKey] = useState<BookSortKey>('createTime-desc');

  /** 每次点「搜索」自增，让面板强制重搜同一个关键词 */
  const [searchNonce, setSearchNonce] = useState(0);
  const [recentAdded, setRecentAdded] = useState<BookItem[]>([]);
  const [recentWatched, setRecentWatched] = useState<RecentItem[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<BookItem | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // 书单
  const [bookLists, setBookLists] = useState<BookList[]>([]);
  const [listMembership, setListMembership] = useState<Record<string, number[]>>({});
  const [bookListsLoading, setBookListsLoading] = useState(false);
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [listTarget, setListTarget] = useState<BookItem | null>(null);
  const [listFormOpen, setListFormOpen] = useState(false);
  const [editingList, setEditingList] = useState<BookList | null>(null);
  const [listItemsOpen, setListItemsOpen] = useState(false);
  const [activeList, setActiveList] = useState<BookList | null>(null);
  const [listItems, setListItems] = useState<BookItem[]>([]);
  const [listItemsLoading, setListItemsLoading] = useState(false);

  // 管理相关弹窗
  const [bookFormOpen, setBookFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [chapterFormOpen, setChapterFormOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  // 上传图书文件（暂存 → 抽取 → 预填 → 确认入库）
  const [bookFormats, setBookFormats] = useState<string[]>(['epub', 'pdf', 'cbz']);
  const [stagingLoading, setStagingLoading] = useState(false);
  const [staging, setStaging] = useState<StagingResult | null>(null);
  const [stagingCoverUrl, setStagingCoverUrl] = useState<string | null>(null);
  const [stagingFormOpen, setStagingFormOpen] = useState(false);
  const [stagingSubmitting, setStagingSubmitting] = useState(false);
  /** 「检索在线元信息」选中后合并进表单的补丁 */
  const [stagingPatch, setStagingPatch] = useState<{ values: Record<string, unknown>; version: number } | null>(
    null,
  );
  const [onlineMetaOpen, setOnlineMetaOpen] = useState(false);
  const stagingInputRef = useRef<HTMLInputElement | null>(null);

  /** 编辑弹窗里的「搜刮元数据」（阶段 4） */
  const [mergeOpen, setMergeOpen] = useState(false);
  /** 搜刮应用后合并回编辑表单的补丁 */
  const [editPatch, setEditPatch] = useState<{ values: Record<string, unknown>; version: number } | null>(null);

  const mapBook = useCallback((raw: Record<string, unknown>): BookItem => {
    const r = raw as unknown as Book & { title?: string; author?: string; cover?: string };
    return {
      id: Number(r.id),
      title: (r.title as string) || (r.bookName as string) || '未命名',
      author: (r.author as string) || (r.bookAuthor as string) || '未知作者',
      cover: (r.cover as string) || (r.bookImg as string),
      description: (r.description as string) || (r.bookDetails as string),
      typeId: r.typeId as number,
      chapterCount: r.chapterCount as number,
      source: r.source as string,
      subtitle: r.subtitle as string | undefined,
      publisher: r.publisher as string | undefined,
      publishedDate: r.publishedDate as string | undefined,
      isbn13: r.isbn13 as string | undefined,
      isbn10: r.isbn10 as string | undefined,
      pageCount: r.pageCount as number | undefined,
      language: r.language as string | undefined,
      seriesName: r.seriesName as string | undefined,
      seriesNumber: r.seriesNumber as number | string | undefined,
      hasFile: Boolean(r.fileKey),
      fileFormat: r.fileFormat as string | undefined,
      fileName: r.fileName as string | undefined,
      fileSize: r.fileSize as number | undefined,
      metadataLocked: Boolean(r.metadataLocked),
    };
  }, []);

  /** 书单列表 + 每本书所在书单（用于点亮收藏图标） */
  const loadLists = useCallback(async () => {
    setBookListsLoading(true);
    try {
      const [listsRes, membershipRes] = await Promise.all([
        getBookListsService(),
        getBookListMembershipService(),
      ]);
      setBookLists((listsRes.data as BookList[]) || []);
      setListMembership(membershipRes.data || {});
    } catch {
      /* ignore */
    } finally {
      setBookListsLoading(false);
    }
  }, []);

  const isInAnyList = useCallback(
    (bookId: number) => (listMembership[String(bookId)]?.length ?? 0) > 0,
    [listMembership],
  );

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      const [sortField, sortOrder] = sortKey.split('-');
      // 关键词搜索与普通列表都吃同一套排序参数（后端 /search 与 /list 口径一致）
      const query = { sortField: sortField as BookSortField, sortOrder: sortOrder as 'asc' | 'desc' };
      if (keyword) {
        res = await searchBookService(keyword, page, PAGE_SIZE, query);
      } else {
        res = await getBookListService(page, PAGE_SIZE, query);
      }
      const { rows, total: t } = normalizePage<Record<string, unknown>>(res);
      setBooks(rows.map(mapBook));
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [keyword, page, mapBook, sortKey]);

  /** 最近添加：直接复用 /list（后端已按 create_time 倒序），只取一页 */
  const loadRecentAdded = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBookListService(1, RECENT_SIZE);
      const { rows } = normalizePage<Record<string, unknown>>(res);
      setRecentAdded(rows.map(mapBook));
    } finally {
      setLoading(false);
    }
  }, [mapBook]);

  const reloadTypes = useCallback(async () => {
    try {
      const res = await getAllTypesService();
      setTypes((res.data as unknown as BookType[]) || []);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshChapters = useCallback(async (bookId: number) => {
    try {
      const res = await getAllChaptersService(bookId);
      setChapters((res.data as unknown as Chapter[]) || []);
    } catch {
      setChapters([]);
    }
  }, []);

  /** 保存后刷新当前视图的列表 */
  const reloadList = useCallback(() => {
    if (view === 'recent') setRecentWatched(getRecent('book'));
    else if (view === 'lists') loadLists();
    else if (view === 'all') loadBooks();
  }, [view, loadLists, loadBooks]);

  /** 上传 / 在线收藏成功后：书单与当前视图都要刷新 */
  const refreshAfterImport = useCallback(() => {
    loadLists();
    if (view !== 'online') reloadList();
  }, [view, loadLists, reloadList]);

  /** 切换元数据锁定（阶段 6） */
  const toggleMetadataLock = async (book: BookItem) => {
    const next = !book.metadataLocked;
    const res = await setBookMetadataLockService(book.id, next);
    if (res.code === 200) {
      toast.success(next ? '已锁定元数据，自动刷新不会改写它' : '已解除元数据锁定');
      setSelected((prev) => (prev && prev.id === book.id ? { ...prev, metadataLocked: next } : prev));
      reloadList();
    }
  };

  /** 批量刷新元数据：只填充空字段，不覆盖已有内容 */
  const runMetadataRefresh = async () => {
    const ok = await confirm({
      title: '批量刷新元数据',
      description: '对未锁定的书按来源检索在线源，**只填充空字段**，已有内容不会被覆盖。继续吗？',
      confirmText: '开始刷新',
    });
    if (!ok) return;
    setRefreshing(true);
    try {
      const res = await refreshBookMetadataService({ limit: 50 });
      if (res.code === 200 && res.data) {
        toast.success(`刷新完成：扫描 ${res.data.scanned} 本，更新 ${res.data.updated} 本`);
        refreshAfterImport();
      } else {
        toast.error(res.message || '刷新失败');
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setRefreshing(false);
    }
  };

  /** 把当前元数据写回 EPUB 文件（阶段 5） */
  const writeBackFile = async (book: BookItem) => {
    const ok = await confirm({
      title: '写回文件元数据',
      description: '会把书名 / 作者 / 出版社 / 出版日期 / 语言 / 简介写进 EPUB 的 OPF 并覆盖原文件。确定继续吗？',
      confirmText: '写回',
    });
    if (!ok) return;
    try {
      const res = await writeBackBookFileService(book.id);
      if (res.code === 200) {
        toast.success('已把元数据写回 EPUB');
        reloadList();
      } else {
        toast.error(res.message || '写回失败');
      }
    } catch {
      /* 拦截器已提示 */
    }
  };

  /** 从 EPUB / PDF 生成（重建）章节 */
  const rebuildChapters = async (book: BookItem) => {
    const ok = await confirm({
      title: chapters.length > 0 ? '重建章节' : '生成章节',
      description:
        '会先删除这本书由文件自动生成的章节，再从 EPUB spine / PDF 标题重新划分。手工新增的章节不受影响。继续吗？',
      confirmText: '开始',
    });
    if (!ok) return;
    try {
      const res = await rebuildBookChaptersService(book.id);
      if (res.code === 200 && res.data) {
        const report = res.data;
        toast.success(
          report.generated > 0 ? `已生成 ${report.generated} 章` : report.message || '没有拆分出章节',
        );
        refreshChapters(book.id);
        reloadList();
      } else {
        toast.error(res.message || '生成失败');
      }
    } catch {
      /* 拦截器已提示 */
    }
  };

  /** 手动扫描 BookDrop 投递目录（阶段 6） */
  const scanDrop = async () => {
    const ok = await confirm({
      title: '扫描投递目录',
      description: '会把投递目录里的 EPUB / PDF / CBZ 自动抽取元数据并入库。确定继续吗？',
      confirmText: '开始扫描',
    });
    if (!ok) return;
    try {
      const res = await scanBookDropService();
      if (res.code === 200 && res.data) {
        const report = res.data;
        toast.success(
          report.scanned === 0
            ? '投递目录里没有可入库的文件'
            : `扫描 ${report.scanned} 个：入库 ${report.imported}，失败 ${report.failed}`,
        );
        refreshAfterImport();
      } else {
        toast.error(res.message || '扫描失败');
      }
    } catch {
      /* 拦截器已提示 */
    }
  };

  /** 在线补全应用后：刷新列表，并把详情弹窗里的当前书重新拉一遍，避免显示旧值 */
  const refreshSelectedBook = useCallback(
    async (id: number) => {
      reloadList();
      try {
        const res = await getBookByIdService(id);
        const data = res.data as unknown as Record<string, unknown>;
        if (data) {
          setSelected((prev) => (prev && prev.id === id ? { ...prev, ...mapBook(data) } : prev));
        }
      } catch {
        /* ignore */
      }
    },
    [reloadList, mapBook],
  );

  const bookCrud = useCrud({
    create: (v) => addBookService(v as Partial<Book>),
    update: (v) => updateBookService(v as Partial<Book>),
    remove: (id) => deleteBookService(id),
    onChanged: reloadList,
    label: '图书',
  });

  // 类型只支持新建 / 编辑：它被图书引用，删除会产生悬空引用
  const typeCrud = useCrud({
    create: (v) => addTypeService(v as Partial<BookType>),
    update: (v) => updateTypeService(v as Partial<BookType>),
    onChanged: reloadTypes,
    label: '类型',
  });

  const chapterCrud = useCrud({
    create: (v) => addChapterService(v as Partial<Chapter>),
    update: (v) => updateChapterService(v as Partial<Chapter>),
    remove: (id) => deleteChapterService(id),
    onChanged: () => {
      if (selected) refreshChapters(selected.id);
    },
    label: '章节',
  });

  useEffect(() => {
    reloadTypes();
    loadLists();
    // 上传前校验用后端支持的格式，避免前端写死与后端漂移
    getSupportedBookFormatsService()
      .then((res) => {
        if (res.code === 200 && Array.isArray(res.data) && res.data.length > 0) {
          setBookFormats(res.data);
        }
      })
      .catch(() => {
        /* 拿不到就沿用默认三格式 */
      });
  }, [reloadTypes, loadLists]);

  useEffect(() => {
    if (view === 'online') return; // 在线结果由 OnlineBooksPanel 自己拉取
    if (view === 'lists') {
      loadLists();
      return;
    }
    if (view === 'recent') {
      // 「最近」只看最近观看（本地阅读记录），不再展示最近添加
      setRecentWatched(getRecent('book'));
      return;
    }
    loadBooks();
  }, [view, loadBooks, loadRecentAdded, loadLists]);

  /** 「最近观看」的本地快照 → 卡片数据（把最近时间放进 description 展示） */
  const watchedBooks = useMemo<BookItem[]>(
    () =>
      recentWatched.slice(0, RECENT_SIZE).map((r) => ({
        id: Number(r.id),
        title: r.title,
        author: r.subtitle || '未知作者',
        cover: r.cover,
        description: relativeTime(r.at),
        isFavorite: isInAnyList(Number(r.id)),
      })),
    [recentWatched, isInAnyList],
  );

  /** 「最近添加」的卡片数据 */
  const addedBooks = useMemo<BookItem[]>(
    () => recentAdded.map((b) => ({ ...b, isFavorite: isInAnyList(b.id) })),
    [recentAdded, isInAnyList],
  );

  /** 普通网格（全部）的数据 */
  const display = useMemo<BookItem[]>(
    () => books.map((b) => ({ ...b, isFavorite: isInAnyList(b.id) })),
    [books, isInAnyList],
  );

  const typeName = (id?: number) => types.find((t) => t.id === id)?.typeName || '未分类';

  /** 上传文件选择框的 accept（跟随后端 /formats） */
  const stagingAccept = useMemo(() => bookFormats.map((f) => `.${f}`).join(','), [bookFormats]);

  /** 暂存文件的抽取结果 → 表单初始值（字段名与 bookFields 一一对应） */
  const stagingInitial = useMemo<Record<string, unknown> | undefined>(() => {
    if (!staging) return undefined;
    const m = staging.metadata ?? {};
    return {
      bookName: m.bookName ?? '',
      subtitle: m.subtitle ?? '',
      bookAuthor: m.bookAuthor ?? '',
      typeId: '',
      publisher: m.publisher ?? '',
      publishedDate: m.publishedDate ?? '',
      isbn13: m.isbn13 ?? '',
      isbn10: m.isbn10 ?? '',
      pageCount: m.pageCount ?? '',
      language: m.language ?? '',
      seriesName: m.seriesName ?? '',
      seriesNumber: m.seriesNumber ?? '',
      // 非表单字段：直接随 values 带进入库请求（EPUB spine 数 / CBZ 页数 / PDF 页数）
      chapterCount: m.chapterCount ?? '',
      bookDetails: m.bookDetails ?? '',
      bookImg: stagingCoverUrl ?? '',
      generateChapters: true,
    };
  }, [staging, stagingCoverUrl]);

  /** 暂存表单上方的文件信息 / 解析提示 / 在线补全入口 */
  const stagingHeader = staging ? (
    <Stack spacing={1.25} sx={{ mb: 2.5 }}>
      <Box sx={{ p: 1.75, bgcolor: 'var(--mm-sunken)', boxShadow: 'var(--mm-sunken-sm)' }}>
        <Typography variant="body2" fontWeight={800} noWrap>
          {staging.fileName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {staging.format.toUpperCase()} · {humanFileSize(staging.size)}
          {staging.metadata?.chapterCount
            ? ` · ${staging.metadata.chapterCount} ${staging.format === 'cbz' ? '页' : '个章节'}`
            : ''}
        </Typography>
      </Box>

      {staging.metadata?.notes?.length ? (
        <Box sx={{ px: 0.5 }}>
          {staging.metadata.notes.map((note) => (
            <Typography key={note} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              · {note}
            </Typography>
          ))}
        </Box>
      ) : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SearchRoundedIcon />}
          onClick={() => setOnlineMetaOpen(true)}
        >
          检索在线元信息补全
        </Button>
        <Typography variant="caption" color="text.secondary">
          {staging.metadata?.hasCover ? '已从文件抽取封面，可在下方替换' : '文件内没有封面，可在下方自行选择'}
        </Typography>
      </Stack>
    </Stack>
  ) : null;

  /** 当前详情书的阅读进度（决定按钮显示「开始阅读」还是「继续阅读」） */
  const selectedProgress = selected ? getReadingProgress(selected.id) : null;

  /** 类型管理弹窗的列表数据 */
  const typeItems: DimensionItem[] = useMemo(
    () =>
      types
        .filter((t) => t.id != null)
        .map((t) => ({
          id: t.id as number,
          label: t.typeName || '未命名',
          raw: { typeName: t.typeName || '' },
        })),
    [types],
  );

  // ============================================================
  // 书单
  // ============================================================

  const openAddToList = (book: BookItem) => {
    setListTarget(book);
    setAddToListOpen(true);
  };

  const addBookToList = async (listId: number) => {
    if (!listTarget) return false;
    try {
      const res = await addBookToListService(listId, listTarget.id);
      if (res.code === 200) {
        toast.success('已加入书单');
        await loadLists();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const openCreateList = () => {
    setEditingList(null);
    setListFormOpen(true);
  };

  const openEditList = (summary: MediaListSummary) => {
    const target = bookLists.find((list) => Number(list.id) === summary.id);
    if (!target) return;
    setEditingList(target);
    setListFormOpen(true);
  };

  const submitList = async (values: Record<string, unknown>) => {
    const payload = {
      name: String(values.name ?? '').trim(),
      description: String(values.description ?? '').trim(),
    };
    if (!payload.name) {
      toast.warning('书单名称不能为空');
      return;
    }
    const res = editingList?.id
      ? await updateBookListService(editingList.id, payload)
      : await createBookListService(payload);
    if (res.code === 200) {
      toast.success(editingList ? '书单已更新' : '书单已创建');
      setListFormOpen(false);
      setEditingList(null);
      loadLists();
    }
  };

  const deleteList = async (summary: MediaListSummary) => {
    const ok = await confirm({
      title: '删除书单',
      description: `确定删除「${summary.name}」吗？书单里的书不会被删除。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    const res = await deleteBookListService(summary.id);
    if (res.code === 200) {
      toast.success('书单已删除');
      loadLists();
    }
  };

  const openListItems = async (summary: MediaListSummary) => {
    const target = bookLists.find((list) => Number(list.id) === summary.id) ?? {
      id: summary.id,
      name: summary.name,
      description: summary.description,
    };
    setActiveList(target);
    setListItemsOpen(true);
    setListItems([]);
    setListItemsLoading(true);
    try {
      const res = await getBookListItemsService(summary.id);
      setListItems(((res.data as Book[]) || []).map((b) => mapBook(b as unknown as Record<string, unknown>)));
    } catch {
      setListItems([]);
    } finally {
      setListItemsLoading(false);
    }
  };

  const removeBookFromList = async (bookId: number) => {
    if (!activeList?.id) return;
    const res = await removeBookFromListService(activeList.id, bookId);
    if (res.code === 200) {
      toast.success('已从书单移除');
      setListItems((items) => items.filter((item) => item.id !== bookId));
      loadLists();
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

  const listMediaItems = useMemo<MediaListItem[]>(
    () =>
      listItems.map((book) => ({
        id: book.id,
        title: book.title,
        subtitle: book.author,
        cover: book.cover,
      })),
    [listItems],
  );

  /**
   * 打开详情前先确认书还在库里。
   *
   * <p>「最近观看」是 localStorage 快照，书被删掉后快照仍会显示；
   * 这里拿到 404 就顺手清掉本地残留，避免点开一个已不存在的书。
   */
  const openDetail = async (book: BookItem) => {
    try {
      const res = await getBookByIdService(book.id);
      if (!res?.data) {
        removeRecent('book', book.id);
        setRecentWatched(getRecent('book'));
        reloadList();
        return;
      }
    } catch (e) {
      if ((e as { code?: number })?.code === 404) {
        removeRecent('book', book.id);
        setRecentWatched(getRecent('book'));
        reloadList();
      }
      return;
    }
    setSelected(book);
    setDetailOpen(true);
    refreshChapters(book.id);
  };

  const startReading = (book: BookItem, chapter?: Chapter) => {
    if (chapter?.id != null) {
      router.push(`/content/book/read/${book.id}?chapterId=${chapter.id}`);
      return;
    }
    // 有阅读进度时按上次的模式续读：
    // 章节模式带 chapterId 跳回原章节；文件模式交给文件阅读器按 chapterIndex / page 续读。
    const progress = getReadingProgress(book.id);
    if (progress?.chapterId != null && progress.mode !== 'file') {
      router.push(`/content/book/read/${book.id}?chapterId=${progress.chapterId}`);
      return;
    }
    router.push(`/content/book/read/${book.id}`);
  };

  // ============================================================
  // 管理：图书
  // ============================================================

  const openCreateBook = () => {
    setEditingBook(null);
    setEditPatch(null);
    setBookFormOpen(true);
  };

  const openEditBook = (book: BookItem) => {
    setEditingBook(book);
    setEditPatch(null);
    setBookFormOpen(true);
  };

  const closeBookForm = () => {
    setBookFormOpen(false);
    setEditingBook(null);
    setEditPatch(null);
  };

  /** 搜刮应用后：重新拉取该书并把新值合并回编辑表单 */
  const applyScrapeToForm = useCallback(
    async (id: number) => {
      reloadList();
      try {
        const res = await getBookByIdService(id);
        const data = res.data as unknown as Record<string, unknown>;
        if (!data) return;
        const updated = mapBook(data);
        setSelected((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
        setEditingBook((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
        setEditPatch((prev) => ({ values: bookToFormValues(updated), version: (prev?.version ?? 0) + 1 }));
      } catch {
        /* ignore */
      }
    },
    [reloadList, mapBook],
  );

  // ============================================================
  // 上传图书文件：暂存 → 抽取 → 预填 → 确认入库
  // ============================================================

  const pickBookFile = () => {
    const input = stagingInputRef.current;
    if (!input) return;
    input.value = '';
    input.click();
  };

  const handleBookFileSelected = async (file?: File | null) => {
    if (!file) return;
    setStagingLoading(true);
    try {
      const res = await stageBookFileService(file);
      if (res.code !== 200 || !res.data?.token) {
        toast.error(res.message || res.msg || '文件解析失败');
        return;
      }
      const staged = res.data;

      // 封面按需取：这里转成 objectURL 供表单预览；最终入库由后端重新抽取
      let coverUrl: string | null = null;
      if (staged.metadata?.hasCover) {
        try {
          const blob = await getStagingCoverService(staged.token);
          if (blob instanceof Blob && blob.size > 0) coverUrl = URL.createObjectURL(blob);
        } catch {
          /* 封面拿不到不影响入库 */
        }
      }

      setStaging(staged);
      setStagingPatch(null);
      setStagingCoverUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return coverUrl;
      });
      setStagingFormOpen(true);
    } catch {
      /* 拦截器已提示 */
    } finally {
      setStagingLoading(false);
    }
  };

  /** 关闭上传表单；`discard` 为 true 时通知后端丢掉暂存文件 */
  const closeStagingDialog = (discard = true) => {
    const token = staging?.token;
    setStagingFormOpen(false);
    setStaging(null);
    setStagingPatch(null);
    setStagingCoverUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (discard && token) {
      discardStagingService(token).catch(() => {
        /* 已过期或已消费，忽略 */
      });
    }
  };

  const submitStagedBook = async (values: Record<string, unknown>, files: Record<string, File>) => {
    if (!staging) return;
    setStagingSubmitting(true);
    try {
      const generateChapters = values.generateChapters !== false;
      const payload = normalizeBookPayload(values);
      delete payload.generateChapters;
      payload.source = 'upload';
      delete payload.id;

      const coverFile = files.bookImg;
      const coverValue = typeof payload.bookImg === 'string' ? payload.bookImg : '';
      // objectURL 只是本地预览，不能落库；用户选了新图则入库后再单独上传
      if (coverValue.startsWith('blob:') || coverFile) delete payload.bookImg;

      const useExtractedCover = !coverFile && !payload.bookImg && Boolean(staging.metadata?.hasCover);
      const res = await importBookWithFileService(
        staging.token,
        payload as Partial<Book>,
        useExtractedCover,
        generateChapters,
      );
      if (res.code !== 200) {
        toast.error(res.message || res.msg || '入库失败');
        return;
      }

      const created = res.data as Book | undefined;
      let coverFailed = false;
      if (coverFile && created?.id) {
        try {
          await updateBookCoverService(created.id, coverFile);
        } catch {
          coverFailed = true;
        }
      }

      toast.success(coverFailed ? '图书已入库，但自定义封面上传失败' : '图书已入库');
      // 后端入库成功时已消费暂存，这里不要再 discard
      closeStagingDialog(false);
      refreshAfterImport();
    } catch {
      /* 拦截器已提示 */
    } finally {
      setStagingSubmitting(false);
    }
  };

  /** 在线元信息只合并有值的字段，不重置用户已经改过的表单 */
  const applyOnlineMetadata = (book: OnlineBookSummary) => {
    const values = onlineMetadataPatch(book);
    if (Object.keys(values).length === 0) {
      toast.info('这条结果没有可补全的字段');
      return;
    }
    setStagingPatch((prev) => ({ values, version: (prev?.version ?? 0) + 1 }));
    setOnlineMetaOpen(false);
    toast.success('已合并在线元信息');
  };

  /** 删除已上传的图书文件（只清文件，不动元数据） */
  const removeBookFile = async (book: BookItem) => {
    const res = await deleteBookFileService(book.id);
    if (res.code === 200) {
      toast.success('图书文件已删除');
      setSelected((prev) =>
        prev && prev.id === book.id
          ? { ...prev, hasFile: false, fileFormat: undefined, fileName: undefined, fileSize: undefined }
          : prev,
      );
      reloadList();
    }
  };

  /** PDF 交给浏览器原生查看器：先带鉴权取 Blob，再开新标签页 */
  const openRawBookFile = async (book: BookItem) => {
    try {
      const blob = await getBookRawFileService(book.id);
      if (!(blob instanceof Blob)) {
        toast.error('文件读取失败');
        return;
      }
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      /* 拦截器已提示 */
    }
  };

  const submitBook = async (values: Record<string, unknown>, files: Record<string, File>) => {
    const isEdit = Boolean(editingBook);
    const payload = normalizeBookPayload(values);

    // 上传预填的封面是 objectURL，不能写进库；真正采用抽取封面由 import 接口处理
    if (typeof payload.bookImg === 'string' && payload.bookImg.startsWith('blob:')) {
      delete payload.bookImg;
    }

    payload.source = isEdit ? editingBook?.source ?? 'manual' : 'manual';
    if (isEdit) payload.id = editingBook!.id;

    const { ok, data } = await bookCrud.save(payload, isEdit);
    if (!ok) return;

    // 封面单独上传：接口需要已有 id，新建时用后端回传的实体 id
    const cover = files.bookImg;
    if (cover) {
      const createdId = (data as { id?: number } | undefined)?.id;
      const targetId = isEdit ? editingBook!.id : createdId;
      if (targetId) {
        try {
          await updateBookCoverService(targetId, cover);
          toast.success('封面上传成功');
          reloadList();
        } catch {
          toast.error('封面上传失败，可在编辑里重试');
        }
      } else {
        toast.warning('未拿到新书 id，封面未上传');
      }
    }

    closeBookForm();
  };

  const removeBook = async (book: BookItem) => {
    const ok = await confirm({
      title: '删除图书',
      description: `确定要删除「${book.title}」吗？此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;

    let notFound = false;
    try {
      const res = await deleteBookService(book.id);
      if (res.code === 200) toast.success('图书已删除');
    } catch (e) {
      if ((e as { code?: number })?.code === 404) {
        // 书其实已经删过了：清掉本地「最近观看」残留即可
        notFound = true;
      } else {
        return; // 其它错误拦截器已提示
      }
    }

    removeRecent('book', book.id);
    setRecentWatched(getRecent('book'));
    setDetailOpen(false);
    setSelected(null);
    reloadList();
    if (notFound) toast.info('该书已不存在，已清理本地记录');
  };

  // ============================================================
  // 管理：类型
  // ============================================================

  const submitType = async (values: Record<string, unknown>, editingId: string | number | null) => {
    const payload = editingId == null ? { ...values } : { ...values, id: editingId };
    const { ok } = await typeCrud.save(payload, editingId != null);
    return ok;
  };

  // ============================================================
  // 管理：章节
  // ============================================================

  const openCreateChapter = () => {
    setEditingChapter(null);
    setChapterFormOpen(true);
  };

  const openEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterFormOpen(true);
  };

  const closeChapterForm = () => {
    setChapterFormOpen(false);
    setEditingChapter(null);
  };

  const submitChapter = async (values: Record<string, unknown>) => {
    if (!selected) return;
    const isEdit = Boolean(editingChapter);
    const payload: Record<string, unknown> = { ...values, bookId: selected.id };

    for (const k of ['chapterNumber', 'wordCount']) {
      if (payload[k] === '' || payload[k] == null) delete payload[k];
      else payload[k] = Number(payload[k]);
    }
    if (isEdit) payload.id = editingChapter!.id;

    const { ok } = await chapterCrud.save(payload, isEdit);
    if (ok) closeChapterForm();
  };

  const removeChapter = async (chapter: Chapter) => {
    if (chapter.id == null) return;
    await chapterCrud.removeById(chapter.id, chapter.chapterTitle || '该章节');
  };

  // ============================================================
  // 搜索 / 排序
  // ============================================================

  /** 搜索：在线视图交给在线面板（nonce 自增强制重搜），否则切到「全部」翻库 */
  const handleSearch = () => {
    if (view === 'online') {
      setSearchNonce((n) => n + 1);
      return;
    }
    setPage(1);
    setView('all');
    if (!keyword) loadBooks();
  };

  /** 所有本地视图共用库布局：左上角标题 + 右上角排序 / 数量 */
  const headerTitle = (() => {
    if (view === 'recent') return '最近';
    if (view === 'lists') return '我的书单';
    if (view === 'all' && keyword) return `“${keyword}” 的搜索结果`;
    return '我的书库';
  })();

  /** 网格列数：一行最多六个 */
  const GRID_COLUMNS = { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(6,1fr)' };

  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 3.5, borderRadius: 'var(--mm-radius-lg)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          {/* 搜索框：三个页面统一常驻，搜索按钮内嵌在框内右侧 */}
          <TextField
            fullWidth
            size="small"
            placeholder={view === 'online' ? '搜索 Google Books（书名 / 作者）' : '输入图书名或作者名'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" variant="contained" onClick={handleSearch}>
                      搜索
                    </Button>
                  </InputAdornment>
                ),
              },
            }}
          />
          {/* 上传放在视图切换左边，保持三个页面工具栏顺序一致 */}
          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
            <Button
              variant="contained"
              startIcon={<UploadFileRoundedIcon />}
              onClick={pickBookFile}
              disabled={stagingLoading}
            >
              上传
            </Button>
          </Stack>

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
            <ToggleButton value="recent">最近</ToggleButton>
            <ToggleButton value="lists">书单</ToggleButton>
            <ToggleButton value="all">库</ToggleButton>
            <ToggleButton value="online">在线</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Card>

      {view !== 'online' && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1 }}
        >
          <Typography variant="h6" fontWeight={800}>
            {headerTitle}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          {view === 'all' ? (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                displayEmpty
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value as BookSortKey);
                  setPage(1);
                }}
                renderValue={(v) => `排序：${SORT_OPTIONS.find((o) => o.value === v)?.label ?? '最近添加'}`}
                inputProps={{ 'aria-label': '排序规则' }}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {view === 'recent' ? `${watchedBooks.length} 条最近记录` : `${listSummaries.length} 个书单`}
            </Typography>
          )}
        </Stack>
      )}

      {view === 'online' ? (
        <OnlineBooksPanel keyword={keyword} nonce={searchNonce} onImported={refreshAfterImport} />
      ) : view === 'recent' ? (
        /* 「最近」只看最近观看（本地阅读记录），网格与「库」一致：一行六个 */
        watchedBooks.length === 0 ? (
          <EmptyState
            icon={<MenuBookRoundedIcon sx={{ fontSize: 64 }} />}
            title="还没有阅读记录"
            description="打开一本书开始阅读后，这里会显示最近看过的书"
          />
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 2.5 }}>
            {watchedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpen={() => openDetail(book)}
                onRead={() => startReading(book)}
                onAddToList={() => openAddToList(book)}
              />
            ))}
          </Box>
        )
      ) : view === 'lists' ? (
        <MediaListPanel
          lists={listSummaries}
          loading={bookListsLoading}
          icon={<LibraryBooksRoundedIcon sx={{ fontSize: 44 }} />}
          unit="本"
          newLabel="新建书单"
          onCreate={openCreateList}
          onOpen={openListItems}
          onEdit={openEditList}
          onDelete={deleteList}
        />
      ) : (
        /* 本地书库（全部） */
        <Box>
          <Box sx={{ minWidth: 0 }}>
            {loading ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 2.5 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} sx={{ borderRadius: 'var(--mm-radius-lg)', overflow: 'hidden' }}>
                    <Skeleton variant="rectangular" sx={{ aspectRatio: '2 / 3', borderRadius: 'var(--mm-radius-lg)' }} />
                  </Card>
                ))}
              </Box>
            ) : display.length === 0 ? (
              <EmptyState
                icon={<MenuBookRoundedIcon sx={{ fontSize: 64 }} />}
                title="没有找到相关图书"
                description="换个关键词试试吧"
              />
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 2.5 }}>
                {display.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpen={() => openDetail(book)}
                    onRead={() => startReading(book)}
                    onAddToList={() => openAddToList(book)}
                  />
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
          </Box>
        </Box>
      )}

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '2rem' } }}>
          {selected?.title}
        </DialogTitle>
        <DialogContent sx={{ overflowX: 'hidden', pt: 2 }}>
          {selected && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
                gap: { xs: 3, md: 4 },
                minWidth: 0,
              }}
            >
              <Box sx={{ boxShadow: 'var(--mm-float)', alignSelf: 'start', bgcolor: 'var(--mm-sunken)' }}>
                <CoverImage
                  src={selected.cover}
                  alt={selected.title}
                  sx={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', display: 'block' }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mb: 2 }}>
                  <Chip label={`作者：${selected.author}`} />
                  <Chip label={typeName(selected.typeId)} variant="outlined" />
                  {selected.source && <Chip label={sourceLabel(selected.source)} variant="outlined" />}
                  {selected.fileFormat && (
                    <Chip label={selected.fileFormat.toUpperCase()} variant="outlined" />
                  )}
                </Stack>

                <Box sx={{ p: 1.75, mb: 2, bgcolor: 'var(--mm-sunken)', boxShadow: 'var(--mm-sunken-sm)' }}>
                  <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                    {selected.publisher && (
                      <Typography variant="body2" color="text.secondary">
                        出版社：{selected.publisher}
                      </Typography>
                    )}
                    {selected.publishedDate && (
                      <Typography variant="body2" color="text.secondary">
                        出版日期：{selected.publishedDate}
                      </Typography>
                    )}
                    {selected.pageCount ? (
                      <Typography variant="body2" color="text.secondary">
                        {selected.pageCount} 页
                      </Typography>
                    ) : null}
                    {(selected.isbn13 || selected.isbn10) && (
                      <Typography variant="body2" color="text.secondary">
                        ISBN：{selected.isbn13 || selected.isbn10}
                      </Typography>
                    )}
                    {selected.seriesName && (
                      <Typography variant="body2" color="text.secondary">
                        丛书：{selected.seriesName}
                        {selected.seriesNumber ? ` #${selected.seriesNumber}` : ''}
                      </Typography>
                    )}
                  </Stack>
                </Box>

                {selected.hasFile && (
                  <Box
                    sx={{
                      p: 1.5,
                      mb: 2,
                      bgcolor: 'var(--mm-sunken)',
                      boxShadow: 'var(--mm-sunken-sm)',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.25}
                      alignItems={{ sm: 'center' }}
                      sx={{ flexWrap: 'wrap', rowGap: 1, minWidth: 0 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: '100%' }}>
                          图书文件：{selected.fileFormat?.toUpperCase() || '未知格式'}
                          {selected.fileName ? ` · ${selected.fileName}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selected.fileSize ? humanFileSize(selected.fileSize) : '已上传'}
                        </Typography>
                      </Box>
                      {selected.fileFormat === 'pdf' && (
                        <Button size="small" variant="outlined" onClick={() => openRawBookFile(selected)}>
                          查看 PDF
                        </Button>
                      )}
                      {selected.fileFormat === 'epub' && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SaveAltRoundedIcon fontSize="small" />}
                          onClick={() => writeBackFile(selected)}
                        >
                          写回元数据
                        </Button>
                      )}
                      {(selected.fileFormat === 'epub' || selected.fileFormat === 'pdf') && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<MenuBookRoundedIcon fontSize="small" />}
                          onClick={() => rebuildChapters(selected)}
                        >
                          {chapters.length > 0 ? '重建章节' : '生成章节'}
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => removeBookFile(selected)}
                      >
                        删除文件
                      </Button>
                    </Stack>
                  </Box>
                )}

                <Typography variant="h6" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
                  简介
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {selected.description || '暂无简介'}
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5, alignItems: 'flex-start' }}>
                  <Box>
                    <Button
                      variant="contained"
                      startIcon={<MenuBookOutlinedIcon />}
                      onClick={() => startReading(selected)}
                    >
                      {selectedProgress ? '继续阅读' : '开始阅读'}
                    </Button>
                    {selectedProgress && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {selectedProgress.chapterTitle
                          ? `上次读到：${selectedProgress.chapterTitle}`
                          : selectedProgress.page != null
                            ? `上次读到：第 ${selectedProgress.page + 1} 页`
                            : selectedProgress.chapterIndex != null
                              ? `上次读到：第 ${selectedProgress.chapterIndex + 1} 章`
                              : '有阅读记录'}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="outlined"
                    color={isInAnyList(selected.id) ? 'warning' : 'inherit'}
                    startIcon={isInAnyList(selected.id) ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
                    onClick={() => openAddToList(selected)}
                  >
                    加入书单
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<EditRoundedIcon />}
                    onClick={() => openEditBook(selected)}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={() => removeBook(selected)}
                  >
                    删除
                  </Button>
                </Stack>
              </Box>
            </Box>
          )}

          <Stack direction="row" alignItems="center" sx={{ mt: 3, mb: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              章节列表
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={openCreateChapter}>
              新增章节
            </Button>
          </Stack>
          {chapters.length === 0 ? (
            <EmptyState
              title="暂无章节"
              description={
                selected?.hasFile && (selected.fileFormat === 'epub' || selected.fileFormat === 'pdf')
                  ? '可在上方文件信息里点「生成章节」自动划分'
                  : undefined
              }
              minHeight={140}
            />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={80}>章节</TableCell>
                  <TableCell>标题</TableCell>
                  <TableCell width={100}>字数</TableCell>
                  <TableCell width={220}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chapters.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.chapterNumber}</TableCell>
                    <TableCell>{c.chapterTitle}</TableCell>
                    <TableCell>{c.wordCount ?? '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" onClick={() => selected && startReading(selected, c)}>
                          阅读
                        </Button>
                        <Tooltip title="编辑章节">
                          <IconButton size="small" aria-label="编辑章节" onClick={() => openEditChapter(c)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除章节">
                          <IconButton size="small" aria-label="删除章节" onClick={() => removeChapter(c)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* 图书新建 / 编辑（编辑时可点顶部「搜刮」用在线源补全） */}
      <FormDialog
        open={bookFormOpen}
        title={editingBook ? '编辑图书' : '新建图书'}
        fields={bookFields(types)}
        initial={editingBook ? bookToFormValues(editingBook) : undefined}
        patch={editPatch}
        header={
          editingBook ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{
                mb: 2.5,
                p: 1.5,
                bgcolor: 'var(--mm-sunken)',
                boxShadow: 'var(--mm-sunken-sm)',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>
                  搜刮元数据
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  从在线书源匹配并补全出版社 / 出版日期 / 简介 / 封面等字段
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SearchRoundedIcon />}
                onClick={() => setMergeOpen(true)}
                sx={{ flexShrink: 0 }}
              >
                搜刮
              </Button>
            </Stack>
          ) : undefined
        }
        submitting={bookCrud.saving}
        onClose={closeBookForm}
        onSubmit={submitBook}
      />

      {/* 搜刮元数据：从编辑弹窗进入；放在编辑弹窗之后，保证层级在其上方 */}
      <BookMetadataMergeDialog
        open={mergeOpen}
        bookId={editingBook?.id}
        onClose={() => setMergeOpen(false)}
        onApplied={() => {
          if (editingBook) void applyScrapeToForm(editingBook.id);
        }}
      />

      {/* 上传图书文件：抽取结果预填 → 用户确认入库 */}
      <FormDialog
        open={stagingFormOpen}
        title="上传图书文件"
        fields={stagingBookFields(types)}
        initial={stagingInitial}
        header={stagingHeader}
        patch={stagingPatch}
        submitting={stagingSubmitting}
        onClose={() => closeStagingDialog()}
        onSubmit={submitStagedBook}
      />

      {/* 上传后补全元信息：用书名 / 作者检索在线书源 */}
      <OnlineMetadataDialog
        open={onlineMetaOpen}
        initialQuery={staging?.metadata?.bookName || staging?.metadata?.bookAuthor || ''}
        onClose={() => setOnlineMetaOpen(false)}
        onSelect={applyOnlineMetadata}
      />

      {/* 上传前的文件选择（隐藏 input，避免把 input 塞进 button） */}
      <input
        ref={stagingInputRef}
        type="file"
        hidden
        accept={stagingAccept}
        onChange={(e) => {
          void handleBookFileSelected(e.target.files?.[0]);
        }}
      />

      {/* 暂存 / 抽取期间阻塞操作，避免用户重复上传 */}
      <Dialog open={stagingLoading} onClose={() => undefined} maxWidth="xs" fullWidth>
        <DialogContent sx={{ py: 5, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2, fontWeight: 700 }}>正在解析图书文件…</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            大文件需要一点时间，请勿关闭页面
          </Typography>
        </DialogContent>
      </Dialog>

      {/* 图书类型管理 */}
      <DimensionDialog
        open={typeDialogOpen}
        title="管理图书类型"
        fields={TYPE_FIELDS}
        items={typeItems}
        saving={typeCrud.saving}
        onClose={() => setTypeDialogOpen(false)}
        onSave={submitType}
      />

      {/* 章节新建 / 编辑 */}
      <FormDialog
        open={chapterFormOpen}
        title={editingChapter ? '编辑章节' : '新增章节'}
        fields={CHAPTER_FIELDS}
        initial={
          editingChapter
            ? {
                chapterNumber: editingChapter.chapterNumber ?? '',
                chapterTitle: editingChapter.chapterTitle ?? '',
                contentPath: editingChapter.contentPath ?? '',
                wordCount: editingChapter.wordCount ?? '',
              }
            : undefined
        }
        submitting={chapterCrud.saving}
        onClose={closeChapterForm}
        onSubmit={submitChapter}
      />

      {/* 书单新建 / 编辑 */}
      <FormDialog
        open={listFormOpen}
        title={editingList ? '编辑书单' : '新建书单'}
        fields={LIST_FIELDS}
        initial={
          editingList
            ? {
                name: editingList.name,
                description: editingList.description ?? '',
              }
            : undefined
        }
        onClose={() => {
          setListFormOpen(false);
          setEditingList(null);
        }}
        onSubmit={submitList}
      />

      {/* 收藏图标 → 选择加入哪个书单 */}
      <AddToListDialog
        open={addToListOpen}
        title="加入书单"
        itemTitle={listTarget?.title}
        lists={listSummaries}
        unit="本"
        icon={<LibraryBooksRoundedIcon />}
        onAdd={addBookToList}
        onClose={() => {
          setAddToListOpen(false);
          setListTarget(null);
        }}
        onCreate={() => {
          setAddToListOpen(false);
          openCreateList();
        }}
      />

      {/* 书单详情 */}
      <ListItemsDialog
        open={listItemsOpen}
        title={activeList?.name || '书单'}
        subtitle={activeList?.description}
        items={listMediaItems}
        loading={listItemsLoading}
        emptyText="书单还是空的"
        onRemove={(item) => removeBookFromList(item.id)}
        onClose={() => setListItemsOpen(false)}
      />
    </Box>
  );
}

/** 图书卡片：整张封面 + 图上叠加书名 / 作者（不放其他信息） */
function BookCard({
  book,
  onOpen,
  onRead,
  onAddToList,
}: {
  book: BookItem;
  onOpen: () => void;
  onRead: () => void;
  onAddToList: () => void;
}) {
  const { mm } = useTheme();
  return (
    <Card
      className="mm-hover-lift"
      onClick={() => onOpen()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      sx={{
        position: 'relative',
        aspectRatio: '2 / 3',
        borderRadius: 'var(--mm-radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <CoverImage
        src={book.cover}
        alt={book.title}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          bgcolor: 'var(--mm-sunken)',
        }}
      />

      {/* 书名 / 作者：叠在封面上层 */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          px: 1.75,
          pt: 4,
          pb: 1.5,
          background: 'var(--mm-scrim)',
          color: 'var(--mm-scrim-text)',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.35 }} noWrap>
          {book.title}
        </Typography>
        <Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.85 }}>
          {book.author}
        </Typography>
      </Box>

      {/* 操作按钮 */}
      <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 10, right: 10 }}>
        <Tooltip title="在线阅读">
          <IconButton
            size="small"
            aria-label="在线阅读"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
            sx={{
              bgcolor: 'var(--mm-bg)',
              color: 'var(--mm-text)',
              boxShadow: 'var(--mm-float)',
              '&:hover': { bgcolor: 'var(--mm-bg)', color: 'var(--mm-accent-text)' },
            }}
          >
            <MenuBookOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={book.isFavorite ? '已在书单中，点击加入其他书单' : '加入书单'}>
          <IconButton
            size="small"
            aria-label="加入书单"
            onClick={(e) => {
              e.stopPropagation();
              onAddToList();
            }}
            sx={{
              bgcolor: 'var(--mm-bg)',
              color: book.isFavorite ? mm.warning : 'var(--mm-text)',
              boxShadow: 'var(--mm-float)',
              '&:hover': { bgcolor: 'var(--mm-bg)' },
            }}
          >
            {book.isFavorite ? <StarRoundedIcon fontSize="small" /> : <StarBorderRoundedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>
    </Card>
  );
}

/** 「最近」里的一个分区：小标题 + 两列卡片网格 */
function RecentColumn({
  title,
  emptyText,
  icon,
  children,
}: {
  title: string;
  emptyText: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const count = Children.count(children);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
        {title}
      </Typography>
      {count === 0 ? (
        <EmptyState icon={icon} title={emptyText} minHeight={180} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

/**
 * 列表视图：一行一本。
 *
 * <p>BookLore 的表格支持自定义显示列并可保存偏好；这里先给一套固定列
 * （封面 / 书名 / 作者 / 类型 / 章节 / 来源 / 操作），列显隐以后有需要再加。
 */
function BookTable({
  books,
  typeName,
  onOpen,
  onRead,
  onAddToList,
}: {
  books: BookItem[];
  typeName: (id?: number) => string;
  onOpen: (book: BookItem) => void;
  onRead: (book: BookItem) => void;
  onAddToList: (book: BookItem) => void;
}) {
  return (
    <Box sx={{ bgcolor: 'var(--mm-bg)', boxShadow: 'var(--mm-raised-sm)', overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={68}>封面</TableCell>
            <TableCell>书名</TableCell>
            <TableCell width={150}>作者</TableCell>
            <TableCell width={140}>类型</TableCell>
            <TableCell width={80} align="right">
              章节
            </TableCell>
            <TableCell width={140}>来源</TableCell>
            <TableCell width={180} align="right">
              操作
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {books.map((book) => (
            <TableRow
              key={book.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => onOpen(book)}
            >
              <TableCell>
                <Box sx={{ width: 40, height: 56, overflow: 'hidden', bgcolor: 'var(--mm-sunken)' }}>
                  <CoverImage
                    src={book.cover}
                    alt={book.title}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {book.title}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap>
                  {book.author}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap>
                  {typeName(book.typeId)}
                </Typography>
              </TableCell>
              <TableCell align="right">{book.chapterCount ?? '—'}</TableCell>
              <TableCell>
                <Typography variant="caption">{sourceLabel(book.source)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRead(book);
                    }}
                  >
                    阅读
                  </Button>
                  <Tooltip title={book.isFavorite ? '已在书单中' : '加入书单'}>
                    <IconButton
                      size="small"
                      aria-label="加入书单"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToList(book);
                      }}
                    >
                      {book.isFavorite ? (
                        <StarRoundedIcon fontSize="small" />
                      ) : (
                        <StarBorderRoundedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}