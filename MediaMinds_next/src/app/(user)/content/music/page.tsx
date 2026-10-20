'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import LyricsRoundedIcon from '@mui/icons-material/LyricsRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EmptyState from '@/components/common/EmptyState';
import AutoGrid from '@/components/common/AutoGrid';
import KugouPanel from '@/components/user/KugouPanel';
import MusicPlaylistPanel from '@/components/user/MusicPlaylistPanel';
import KugouLoginDialog from '@/components/user/KugouLoginDialog';
import AddToPlaylistDialog from '@/components/user/AddToPlaylistDialog';
import PlaylistSongsDialog from '@/components/user/PlaylistSongsDialog';
import type { KugouDimension } from '@/api/kugou';
import { getKugouPlayUrlService, refreshKugouSongUrlService } from '@/api/kugou';
import CoverImage from '@/components/common/CoverImage';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { getRecent, relativeTime, removeRecent, type RecentItem } from '@/lib/recent';
import { toast } from '@/lib/notify';
import { normalizePage } from '@/lib/page';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore, type Track } from '@/stores/playerStore';
import type { SongList } from '@/types';
import {
  getAllSongsService,
  getSongByIdService,
  getSongByNameService,
  getAllSingersService,
  getAllSongListsService,
  getListSongBySongListIdService,
  getUserCollectionsService,
  addCollectionService,
  addCommentService,
  getCommentsService,
  likeCommentService,
  addSongService,
  updateSongService,
  deleteSongService,
  uploadSongFileService,
  uploadSongCoverService,
  addSongListService,
  updateSongListService,
  deleteSongListService,
  updateSongListCoverService,
} from '@/api/music';
import FormDialog, { type FormField } from '@/components/manage/FormDialog';
import { useCrud } from '@/components/manage/useCrud';

const DIMENSION_LABEL: Record<KugouDimension, string> = {
  song: '歌曲',
  singer: '歌手',
  album: '专辑',
};

type TabKey = 'recent' | 'songs' | 'playlists' | 'kugou';

const PAGE_SIZE = 12;

/** 库的排序选项（字段 + 方向），默认最近添加 */
type MusicSortKey = 'createTime-desc' | 'createTime-asc' | 'name-asc' | 'name-desc';

const SORT_OPTIONS: { value: MusicSortKey; label: string }[] = [
  { value: 'createTime-desc', label: '最近添加' },
  { value: 'createTime-asc', label: '最早添加' },
  { value: 'name-asc', label: '歌名 A → Z' },
  { value: 'name-desc', label: '歌名 Z → A' },
];

/**
 * 歌曲表单字段。
 * `song` 表里 `singer_id` / `name` / `url` 都是 NOT NULL——
 * 新建时音频文件由后端写入 `url`，所以音频在新建时必填、编辑时选填。
 */
const songFields = (singers: Record<string, unknown>[], isEdit: boolean): FormField[] => [
  { name: 'name', label: '歌曲名', required: true, maxLength: 45 },
  {
    name: 'singerId',
    label: '歌手',
    type: 'select',
    required: true,
    options: singers
      .filter((x) => x.id != null)
      .map((x) => ({ label: String(x.name ?? '未命名'), value: Number(x.id) })),
  },
  { name: 'introduction', label: '简介', maxLength: 255 },
  {
    name: 'file',
    label: '音频文件',
    type: 'file',
    accept: 'audio/*',
    helperText: isEdit ? '选填；上传后覆盖原音频' : '必填：新建歌曲必须上传音频文件',
  },
  { name: 'cover', label: '封面', type: 'image', accept: 'image/*' },
];

/** 歌单表单（`song_list.title` NOT NULL） */
const SONGLIST_FIELDS: FormField[] = [
  { name: 'title', label: '歌单名', required: true, maxLength: 255 },
  { name: 'style', label: '风格', maxLength: 10, helperText: '最多 10 字' },
  { name: 'introduction', label: '简介', type: 'textarea', rows: 3 },
  { name: 'pic', label: '封面', type: 'image', accept: 'image/*' },
];

/** 「最近添加」「最近播放」各只取 12 个，一眼看完、不分页 */
const RECENT_SIZE = 12;

export default function MusicViewPage() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.info?.userId) || 0;
  const confirm = useConfirm();
  const { current, playing, play, addToPlaylist, setPlaying } = usePlayerStore();

  const [tab, setTab] = useState<TabKey>('recent');
  const [keyword, setKeyword] = useState('');
  const [songListId, setSongListId] = useState<number | ''>('');
  /** 库的排序：默认按添加顺序（最新在最上） */
  const [sortKey, setSortKey] = useState<MusicSortKey>('createTime-desc');
  /** 「全部」列表的分页（原先恒为第 1 页，导致只能看到 12 首） */
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  /** 在线搜索维度：歌曲 / 歌手 / 专辑 */
  const [onlineDimension, setOnlineDimension] = useState<KugouDimension>('song');
  /** 每次点「搜索」自增，让面板强制重搜同一个关键词 */
  const [searchNonce, setSearchNonce] = useState(0);
  const [loading, setLoading] = useState(false);

  const [songs, setSongs] = useState<Record<string, unknown>[]>([]);
  const [recentAdded, setRecentAdded] = useState<Record<string, unknown>[]>([]);
  const [recentWatched, setRecentWatched] = useState<RecentItem[]>([]);
  const [singers, setSingers] = useState<Record<string, unknown>[]>([]);
  const [songLists, setSongLists] = useState<Record<string, unknown>[]>([]);
  const [collections, setCollections] = useState<Record<string, unknown>[]>([]);
  const [collectionTotal, setCollectionTotal] = useState(0);

  const [lyricDialog, setLyricDialog] = useState<{ open: boolean; song?: Record<string, unknown> }>({ open: false });

  const [commentDialog, setCommentDialog] = useState<{ open: boolean; song?: Record<string, unknown> }>({ open: false });

  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [commentText, setCommentText] = useState('');

  // 管理相关弹窗
  const [songFormOpen, setSongFormOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Record<string, unknown> | null>(null);
  const [playlistFormOpen, setPlaylistFormOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Record<string, unknown> | null>(null);
  const [kugouLoginOpen, setKugouLoginOpen] = useState(false);
  /** 「加入歌单」弹窗当前歌曲 */
  const [addDialog, setAddDialog] = useState<{ open: boolean; song: Record<string, unknown> | null }>({
    open: false,
    song: null,
  });
  /** 歌单详情弹窗（收藏是特殊歌单） */
  const [playlistView, setPlaylistView] = useState<{
    open: boolean;
    favorite: boolean;
    list: Record<string, unknown> | null;
  }>({ open: false, favorite: false, list: null });

  /** 「全部」列表：选中歌单时取该歌单的歌，否则按关键词搜索 / 全量分页 */
  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = sortKey.split('-');
      const sort = { sortField, sortOrder };
      let res;
      if (songListId !== '') {
        // 歌单内歌曲按歌单原顺序展示，排序下拉在筛选歌单时禁用
        res = await getListSongBySongListIdService(songListId, { pageNum: page, pageSize: PAGE_SIZE });
      } else if (keyword) {
        res = await getSongByNameService(keyword, { pageNum: page, pageSize: PAGE_SIZE, ...sort });
      } else {
        res = await getAllSongsService({ pageNum: page, pageSize: PAGE_SIZE, ...sort });
      }
      const { rows, total: t } = normalizePage<Record<string, unknown>>(res);
      setSongs(rows);
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [keyword, songListId, page, sortKey]);

  /**
   * 搜索：切到「全部」视图展示结果，并清掉歌单筛选。
   * 若视图/歌单筛选都没变，effect 不会重跑，这里手动补一次。
   */
  /** 点歌手 / 专辑时，用它的名字再搜一次歌曲 */
  const handleSearchByName = (name: string) => {
    if (!name.trim()) return;
    setKeyword(name);
    setOnlineDimension('song');
    setSearchNonce((n) => n + 1);
  };

  const handleSearch = () => {
    if (tab === 'kugou') {
      // 在线：交给酷狗面板，nonce 自增强制重搜
      setSearchNonce((n) => n + 1);
      return;
    }
    const unchanged = tab === 'songs' && songListId === '' && page === 1;
    setTab('songs');
    setSongListId('');
    setPage(1);
    if (unchanged) fetchSongs();
  };

  /** 筛选歌单：切到「全部」视图展示该歌单的歌曲 */
  const handleSongListChange = (value: number | '') => {
    setSongListId(value);
    setKeyword('');
    setTab('songs');
    setPage(1);
  };

  /** 仅用于补全歌曲歌手名的后台预取，不参与前台 loading 状态 */
  const fetchSingers = useCallback(async () => {
    try {
      const res = await getAllSingersService({ pageNum: 1, pageSize: 500 });
      setSingers(normalizePage<Record<string, unknown>>(res).rows);
    } catch {
      /* 拿不到歌手名时列表回落「未知歌手」，不影响其他功能 */
    }
  }, []);

  /** 最近添加：直接复用 /list（后端已按 create_time 倒序），只取一页 */
  const fetchRecentAdded = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllSongsService({ pageNum: 1, pageSize: RECENT_SIZE });
      setRecentAdded(normalizePage<Record<string, unknown>>(res).rows);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 歌曲接口不返回歌手名，按 singerId 在前端补全 */
  const singerNameById = useMemo(() => {
    const map = new Map<string, string>();
    singers.forEach((s) => {
      if (s.id != null && s.name) map.set(String(s.id), String(s.name));
    });
    return map;
  }, [singers]);

  /** 歌单筛选下拉的数据源：一次取满，不参与前台 loading 状态 */
  const fetchSongLists = useCallback(async () => {
    try {
      const res = await getAllSongListsService({ pageNum: 1, pageSize: 500 });
      setSongLists(normalizePage<Record<string, unknown>>(res).rows);
    } catch {
      /* 拿不到歌单时下拉只剩「全部歌单」，不影响其他功能 */
    }
  }, []);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await getUserCollectionsService({ pageNum: 1, pageSize: 50 });
      const { rows, total } = normalizePage<Record<string, unknown>>(res);
      setCollections(rows);
      setCollectionTotal(total);
    } catch {
      /* 收藏数拿不到不影响其它功能 */
    }
  }, []);

  useEffect(() => {
    if (tab === 'recent') {
      // 「最近」只看最近播放（本地记录）
      setRecentWatched(getRecent('music'));
    } else if (tab === 'songs') fetchSongs();
    else if (tab === 'playlists') {
      fetchSongLists();
      fetchCollections();
    }
  }, [tab, fetchSongs, fetchRecentAdded, fetchSongLists, fetchCollections]);

  // ============================================================
  // 管理：CRUD
  // ============================================================

  /**
   * 新建歌曲走 multipart（`song` + `file`），而 `useCrud.create` 只收 values，
   * 所以用 ref 把待上传的音频透传给 create。
   */
  const pendingAudioRef = useRef<File | null>(null);

  const reloadList = useCallback(() => {
    if (tab === 'recent') setRecentWatched(getRecent('music'));
    else if (tab === 'songs') fetchSongs();
    else if (tab === 'playlists') {
      fetchSongLists();
      fetchCollections();
    }
  }, [tab, fetchSongs, fetchRecentAdded, fetchSongLists, fetchCollections]);

  const songCrud = useCrud({
    create: (v) => addSongService(v, pendingAudioRef.current ?? undefined),
    update: (v) => updateSongService(Number(v.id), v),
    remove: (id) => deleteSongService(id),
    onChanged: reloadList,
    label: '歌曲',
  });

  // 歌单只支持新建 / 编辑 / 删除（删除时后端会清掉歌单-歌曲关联）
  const songListCrud = useCrud({
    create: (v) => addSongListService(v as Partial<SongList>),
    update: (v) => updateSongListService(Number(v.id), v as Partial<SongList>),
    onChanged: fetchSongLists,
    label: '歌单',
  });

  // ============================================================
  // 管理：歌曲
  // ============================================================

  const openCreateSong = () => {
    setEditingSong(null);
    setSongFormOpen(true);
  };

  const openEditSong = (song: Record<string, unknown>) => {
    setEditingSong(song);
    setSongFormOpen(true);
  };

  const closeSongForm = () => {
    setSongFormOpen(false);
    setEditingSong(null);
  };

  const submitSong = async (values: Record<string, unknown>, files: Record<string, File>) => {
    const isEdit = Boolean(editingSong);
    const payload: Record<string, unknown> = { ...values };

    if (payload.singerId === '' || payload.singerId == null) delete payload.singerId;
    else payload.singerId = Number(payload.singerId);

    const audio = files.file;
    const cover = files.cover;

    if (!isEdit && !audio) {
      toast.warning('新建歌曲必须选择音频文件');
      return;
    }

    const editingId = isEdit ? Number(editingSong!.id) : undefined;
    if (editingId != null) payload.id = editingId;

    // 新建：音频随 create 一起提交
    pendingAudioRef.current = audio ?? null;
    let createdId: number | undefined;
    try {
      const { ok, data } = await songCrud.save(payload, isEdit);
      if (!ok) return;
      createdId = (data as { id?: number } | undefined)?.id;
    } finally {
      pendingAudioRef.current = null;
    }

    const songId = isEdit ? editingId : createdId;

    // 编辑：音频走独立端点
    if (isEdit && audio && songId) {
      try {
        await uploadSongFileService(songId, audio);
        toast.success('音频已更新');
      } catch {
        toast.error('音频上传失败');
      }
    }

    if (cover) {
      if (songId) {
        try {
          await uploadSongCoverService(songId, cover);
          toast.success('封面已上传');
        } catch {
          toast.error('封面上传失败');
        }
      } else {
        toast.warning('未拿到歌曲 id，封面未上传');
      }
    }

    closeSongForm();
    reloadList();
  };

  /** 「最近播放」卡片的移除：只删本地播放记录，不动曲库（在线歌的 id 是 hash，不能当 songId 用） */
  const removeFromRecent = (song: Record<string, unknown>) => {
    const id = song.recentId ?? song.id;
    if (id == null) return;
    removeRecent('music', id as string);
    setRecentWatched(getRecent('music'));
  };

  const removeSong = async (song: Record<string, unknown>) => {
    const id = Number(song.id);
    if (!id) return;

    const ok = await confirm({
      title: '删除歌曲',
      description: `确定要删除「${String(song.name ?? '')}」吗？此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;

    const cleanupRecent = () => {
      removeRecent('music', id);
      setRecentWatched(getRecent('music'));
    };

    // 「最近播放」是本地快照：先确认歌还在库，避免对一个已删除的歌反复报错
    try {
      const res = await getSongByIdService(id);
      if (!res?.data) {
        cleanupRecent();
        reloadList();
        return;
      }
    } catch (e) {
      if ((e as { code?: number })?.code === 404) {
        cleanupRecent();
        reloadList();
        toast.info('该歌曲已不存在，已清理本地记录');
      }
      return;
    }

    try {
      const res = await deleteSongService(id);
      if (res.code !== 200) return; // 拦截器已提示
      toast.success('歌曲已删除');
      cleanupRecent();
      reloadList();
    } catch {
      /* 拦截器已提示 */
    }
  };

  // ============================================================
  // 管理：歌单（封面在保存成功后单独上传）
  // ============================================================

  const openCreatePlaylist = () => {
    setEditingPlaylist(null);
    setPlaylistFormOpen(true);
  };

  const openEditPlaylist = (list: Record<string, unknown>) => {
    setEditingPlaylist(list);
    setPlaylistFormOpen(true);
  };

  const submitSongList = async (values: Record<string, unknown>, files: Record<string, File>) => {
    const isEdit = Boolean(editingPlaylist);
    const payload: Record<string, unknown> = isEdit ? { ...values, id: editingPlaylist!.id } : { ...values };

    const { ok, data } = await songListCrud.save(payload, isEdit);
    if (!ok) return;

    const cover = files.pic;
    if (cover) {
      const targetId = isEdit ? Number(editingPlaylist!.id) : (data as { id?: number } | undefined)?.id;
      if (targetId) {
        try {
          await updateSongListCoverService(targetId, cover);
          toast.success('封面已上传');
        } catch {
          toast.error('封面上传失败');
        }
      } else {
        toast.warning('未拿到歌单 id，封面未上传');
      }
    }

    setPlaylistFormOpen(false);
    setEditingPlaylist(null);
    fetchSongLists();
  };

  const removePlaylist = async (list: Record<string, unknown>) => {
    const id = Number(list.id);
    if (!id) return;
    const ok = await confirm({
      title: '删除歌单',
      description: `确定删除「${String(list.title ?? '未命名歌单')}」吗？歌单里的歌曲不会从曲库删除。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    const res = await deleteSongListService(id);
    if (res.code === 200) {
      toast.success('歌单已删除');
      fetchSongLists();
      fetchCollections();
    }
  };

  const toTrack = useCallback(
    (s: Record<string, unknown>): Track => ({
      id: (s.id as number) || crypto.randomUUID(),
      name: String(s.name ?? '未知歌曲'),
      url: s.url as string,
      pic: s.pic as string,
      singerId: s.singerId as number,
      singerName:
        (s.singerName as string) ||
        singerNameById.get(String(s.singerId)) ||
        '未知歌手',
      lyrics: s.lyric as string,
      hash: (s.kugouHash as string) || undefined,
      albumId: (s.kugouAlbumId as string) || undefined,
      albumAudioId: (s.kugouAlbumAudioId as string) || undefined,
      source: s.kugouHash ? 'kugou' : 'local',
    }),
    [singerNameById],
  );

  /**
   * 播放前确保拿到可用地址。
   *
   * <p>酷狗直链会过期，且很多歌导入时拿不到地址；这里按 songId 取回完整记录，
   * 再调后端用 hash 重新解析一次。拿不到就退回已有 url。
   */
  const resolvePlayableSong = useCallback(async (song: Record<string, unknown>) => {
    let full = song;
    const localId = Number(song.id);
    const isLocalSong = Number.isFinite(localId) && localId > 0;
    // 最近播放的本地快照只有 id/名字/封面，缺 url 与 hash，先取完整记录
    if (isLocalSong && (!song.url || song.kugouHash === undefined)) {
      try {
        const res = await getSongByIdService(localId);
        if (res.data) full = { ...song, ...(res.data as unknown as Record<string, unknown>) };
      } catch (e) {
        // 歌已经被删了：清掉本地「最近播放」里的残留
        if ((e as { code?: number })?.code === 404) {
          removeRecent('music', song.id as string);
          setRecentWatched(getRecent('music'));
        }
      }
    }
    if (full.kugouHash) {
      try {
        if (Number.isFinite(Number(full.id)) && Number(full.id) > 0) {
          // 本地歌曲：按 songId 用后端存的 hash 刷新
          const res = await refreshKugouSongUrlService(Number(full.id));
          const url = res.data as unknown as string;
          if (res.code === 200 && typeof url === 'string' && url) {
            full = { ...full, url };
          }
        } else {
          // 在线播放留下的历史快照：id 就是酷狗 hash，直接按 hash 取直链
          const res = await getKugouPlayUrlService(String(full.kugouHash), '128', '', '');
          const data = res.data as unknown as { url?: string | string[] } | undefined;
          const url = Array.isArray(data?.url) ? data?.url[0] : data?.url;
          if (res.code === 200 && url) {
            full = { ...full, url };
          }
        }
      } catch {
        /* 刷新失败就用已有 url（可能已过期） */
      }
    }
    return full;
  }, []);

  /** 列表渲染用：补全歌曲的 singerName */
  const withSinger = useCallback(
    (s: Record<string, unknown>) => ({
      ...s,
      singerName:
        (s.singerName as string) ||
        singerNameById.get(String(s.singerId)) ||
        '未知歌手',
    }),
    [singerNameById],
  );

  /** 「最近添加」的列表：后端已按 create_time 倒序，补全歌手名 */
  const addedSongs = useMemo<Record<string, unknown>[]>(
    () => recentAdded.map(withSinger),
    [recentAdded, withSinger],
  );

  /** 「最近播放」的列表：本地记录只有卡片快照，把「最近时间」作为 meta 展示 */
  const watchedSongs = useMemo<Record<string, unknown>[]>(
    () =>
      recentWatched.slice(0, RECENT_SIZE).map((r) => ({
        // r.id 可能是本地 song id，也可能是在线播放留下的酷狗 hash
        id: r.id,
        recentId: r.id,
        name: r.title,
        singerName: r.subtitle || '未知歌手',
        pic: r.cover,
        recentAt: relativeTime(r.at),
        kugouHash: /^\d+$/.test(String(r.id)) ? undefined : String(r.id),
      })),
    [recentWatched],
  );

  const currentIsPlaying = (id: unknown) => String(current?.id) === String(id) && playing;

  /** 所有本地视图共用库布局：左上角标题 + 右上角排序 / 数量 */
  const headerTitle = tab === 'recent' ? '最近' : tab === 'playlists' ? '我的歌单' : '我的音乐库';

  /** 点卡片封面：解析出可用地址后播放，并进入播放界面 */
  const handlePlay = async (song: Record<string, unknown>) => {
    const playable = await resolvePlayableSong(song);
    if (!playable.url) {
      toast.error('暂时拿不到播放地址，可能需要先登录酷狗或该曲目需要会员');
      return;
    }
    if (String(current?.id) === String(playable.id)) {
      setPlaying(true);
    } else {
      play(toTrack(playable));
    }
    router.push('/content/music/playing');
  };

  const favoriteIds = useMemo(
    () => collections.map((c) => String(c.songId ?? c.id)),
    [collections],
  );

  const openLyric = (song: Record<string, unknown>) => {
    setLyricDialog({ open: true, song });
  };

  const openComments = async (song: Record<string, unknown>) => {
    setCommentDialog({ open: true, song });
    setCommentText('');
    try {
      const res = await getCommentsService({ songId: song.id, pageNum: 1, pageSize: 20 });
      setComments(normalizePage<Record<string, unknown>>(res).rows);
    } catch {
      setComments([]);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) {
      toast.warning('请输入评论内容');
      return;
    }
    const res = await addCommentService({
      content: commentText,
      songId: commentDialog.song?.id,
      type: '0',
      userId,
    });
    if (res.code === 200) {
      toast.success('评论成功');
      setCommentText('');
      if (commentDialog.song) openComments(commentDialog.song);
    }
  };

  const likeComment = async (id: unknown) => {
    await likeCommentService(String(id));
    if (commentDialog.song) openComments(commentDialog.song);
  };

  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 3.5, borderRadius: 'var(--mm-radius-lg)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        {/* 搜索框：三个页面统一常驻，搜索按钮内嵌在框内右侧 */}
        <TextField
          fullWidth
          size="small"
          placeholder={tab === 'kugou' ? '搜索在线音乐（歌曲 / 歌手 / 专辑）' : '搜索歌曲名称'}
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          {tab === 'kugou' ? (
            /* 在线：筛选变成搜索维度 */
            <Select
              displayEmpty
              value={onlineDimension}
              onChange={(e) => setOnlineDimension(e.target.value as KugouDimension)}
              renderValue={(v) => DIMENSION_LABEL[v as KugouDimension] ?? '歌曲'}
              inputProps={{ 'aria-label': '搜索维度' }}
            >
              <MenuItem value="song">歌曲</MenuItem>
              <MenuItem value="singer">歌手</MenuItem>
              <MenuItem value="album">专辑</MenuItem>
            </Select>
          ) : (
            /* 本地：按歌单筛选（不显示浮动标签，框内默认「全部歌单」） */
            <Select
              displayEmpty
              value={songListId}
              onChange={(e) => handleSongListChange(e.target.value as number | '')}
              renderValue={(v) => {
                const key = v as number | '';
                if (key === '') return '全部歌单';
                return String(songLists.find((l) => Number(l.id) === Number(key))?.title ?? '全部歌单');
              }}
              inputProps={{ 'aria-label': '按歌单筛选' }}
            >
              <MenuItem value="">全部歌单</MenuItem>
              {songLists.map((l) => (
                <MenuItem key={String(l.id)} value={Number(l.id)}>
                  {String(l.title ?? '')}
                </MenuItem>
              ))}
            </Select>
          )}
        </FormControl>

          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateSong}>
              上传
            </Button>
            <Button variant="outlined" startIcon={<LoginRoundedIcon />} onClick={() => setKugouLoginOpen(true)}>
              登录
            </Button>
          </Stack>

          <ToggleButtonGroup
            exclusive
            value={tab}
            onChange={(_, v) => {
              if (v) {
                setTab(v);
                setKeyword('');
                setSongListId('');
                setPage(1);
              }
            }}
            size="small"
          >
            <ToggleButton value="recent">最近</ToggleButton>
            <ToggleButton value="playlists">歌单</ToggleButton>
            <ToggleButton value="songs">库</ToggleButton>
            <ToggleButton value="kugou">在线</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Card>

      {tab !== 'kugou' && (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            {headerTitle}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          {tab === 'songs' ? (
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <Select
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value as MusicSortKey);
                  setPage(1);
                }}
                disabled={songListId !== ''}
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
              {tab === 'recent'
                ? `${watchedSongs.length} 条最近记录`
                : `${songLists.length + 1} 个歌单`}
            </Typography>
          )}
        </Stack>
      )}

      {tab === 'kugou' ? (
        <KugouPanel
          keyword={keyword}
          dimension={onlineDimension}
          nonce={searchNonce}
          onSearchByName={handleSearchByName}
          onImported={() => {
            fetchSingers();
            fetchSongs();
            fetchCollections();
          }}
          onAddToPlaylist={(song) => setAddDialog({ open: true, song })}
        />
      ) : tab === 'recent' ? (
        /* 「最近」只看最近播放，卡片布局与「库」一致，且不分页 */
        watchedSongs.length === 0 ? (
          <EmptyState icon={<HeadphonesRoundedIcon sx={{ fontSize: 64 }} />} title="暂无播放记录" />
        ) : (
          <AutoGrid minWidth={300}>
            {watchedSongs.map((s) => (
              <SongRow
                key={String(s.id)}
                song={s}
                meta={s.recentAt as string}
                onAddToPlaylist={() => setAddDialog({ open: true, song: s })}
                onRemove={() => removeFromRecent(s)}
                onPlay={() => handlePlay(s)}
                onQueue={() => {
                  addToPlaylist(toTrack(s));
                  toast.success('已加入播放列表');
                }}
              />
            ))}
          </AutoGrid>
        )
      ) : loading ? (
        <AutoGrid minWidth={240}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} sx={{ borderRadius: 'var(--mm-radius-lg)', overflow: 'hidden' }}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 'var(--mm-radius-lg) var(--mm-radius-lg) 0 0' }} />
              <CardContent>
                <Skeleton variant="text" />
              </CardContent>
            </Card>
          ))}
        </AutoGrid>
      ) : tab === 'songs' ? (
        <>
          {songs.length === 0 ? (
            <EmptyState icon={<HeadphonesRoundedIcon sx={{ fontSize: 64 }} />} title="暂无歌曲" />
          ) : (
          <>
          <AutoGrid minWidth={300}>
            {songs.map((s) => (
              <SongRow
                key={String(s.id)}
                song={withSinger(s)}
                onAddToPlaylist={() => setAddDialog({ open: true, song: s })}
                onRemove={() => removeSong(s)}
                onPlay={() => handlePlay(s)}
                onQueue={() => {
                  addToPlaylist(toTrack(s));
                  toast.success('已加入播放列表');
                }}
              />
            ))}
          </AutoGrid>

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
              第 {page} 页 / 共 {Math.max(1, Math.ceil(total / PAGE_SIZE))} 页 · {total} 首
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
          </>
          )}
        </>
      ) : tab === 'playlists' ? (
        <MusicPlaylistPanel
          songLists={songLists}
          favoriteCount={collectionTotal}
          loading={loading}
          onOpenFavorite={() => setPlaylistView({ open: true, favorite: true, list: null })}
          onOpenList={(list) => setPlaylistView({ open: true, favorite: false, list })}
          onCreate={openCreatePlaylist}
          onEdit={openEditPlaylist}
          onDelete={removePlaylist}
        />
      ) : null}

      {/* 歌词 */}
      <Dialog open={lyricDialog.open} onClose={() => setLyricDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{String(lyricDialog.song?.name ?? '歌词')}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              maxHeight: 380,
              overflowY: 'auto',
              p: 2.5,
              borderRadius: 'var(--mm-radius)',
              bgcolor: 'var(--mm-sunken)',
              boxShadow: 'var(--mm-sunken-sm)',
              whiteSpace: 'pre-wrap',
              fontSize: 13,
            }}
          >
            {(lyricDialog.song?.lyric as string) || '该歌曲暂无歌词'}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLyricDialog({ open: false })}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 评论 */}
      <Dialog open={commentDialog.open} onClose={() => setCommentDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>评论 · {String(commentDialog.song?.name ?? '')}</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="写下你的评论…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button variant="contained" onClick={submitComment}>
              发布
            </Button>
          </Stack>
          <List sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {comments.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                暂无评论，来抢沙发吧
              </Typography>
            ) : (
              comments.map((c) => (
                <ListItem key={String(c.id)} alignItems="flex-start" secondaryAction={
                  <Button size="small" onClick={() => likeComment(c.id)}>
                    赞 {String(c.up ?? 0)}
                  </Button>
                }>
                  <ListItemAvatar>
                    <Avatar>{(String(c.userId ?? 'U'))[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={String(c.content ?? '')} secondary={`用户 ${c.userId ?? ''}`} />
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCommentDialog({ open: false })}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 歌曲新建 / 编辑 */}
      <FormDialog
        open={songFormOpen}
        title={editingSong ? '编辑歌曲' : '新建歌曲'}
        fields={songFields(singers, Boolean(editingSong))}
        initial={
          editingSong
            ? {
                name: String(editingSong.name ?? ''),
                singerId: editingSong.singerId ?? '',
                introduction: editingSong.introduction ?? '',
                cover: editingSong.pic ?? '',
              }
            : undefined
        }
        submitting={songCrud.saving}
        onClose={closeSongForm}
        onSubmit={submitSong}
      />

      {/* 歌单新建 / 编辑（封面在保存后单独上传） */}
      <FormDialog
        open={playlistFormOpen}
        title={editingPlaylist ? '编辑歌单' : '新建歌单'}
        fields={SONGLIST_FIELDS}
        initial={
          editingPlaylist
            ? {
                title: String(editingPlaylist.title ?? ''),
                style: editingPlaylist.style ?? '',
                introduction: editingPlaylist.introduction ?? '',
                pic: editingPlaylist.pic ?? '',
              }
            : undefined
        }
        submitting={songListCrud.saving}
        onClose={() => {
          setPlaylistFormOpen(false);
          setEditingPlaylist(null);
        }}
        onSubmit={submitSongList}
      />

      {/* 加入歌单（收藏是特殊歌单） */}
      <AddToPlaylistDialog
        open={addDialog.open}
        song={addDialog.song}
        songLists={songLists}
        onClose={() => setAddDialog({ open: false, song: null })}
        onChanged={() => {
          fetchCollections();
          fetchSongLists();
        }}
        onCreatePlaylist={() => {
          setAddDialog({ open: false, song: null });
          openCreatePlaylist();
        }}
        onAddFavorite={async () => {
          const songId = Number(addDialog.song?.id);
          if (!songId) return false;
          const res = await addCollectionService('0', songId);
          if (res.code === 200) {
            toast.success('已加入「我的收藏」');
            fetchCollections();
            return true;
          }
          return false;
        }}
      />

      {/* 歌单详情：查看歌曲 / 从歌单移除 */}
      <PlaylistSongsDialog
        open={playlistView.open}
        favorite={playlistView.favorite}
        songList={playlistView.list}
        singerNameById={singerNameById}
        onClose={() => setPlaylistView({ open: false, favorite: false, list: null })}
        onChanged={() => {
          fetchCollections();
          fetchSongLists();
        }}
      />

      {/* 酷狗登录 */}
      <KugouLoginDialog open={kugouLoginOpen} onClose={() => setKugouLoginOpen(false)} />
    </Box>
  );
}

function SongRow({
  song,
  meta,
  onPlay,
  onQueue,
  onAddToPlaylist,
  onRemove,
}: {
  song: Record<string, unknown>;
  meta?: string;
  onPlay: () => void;
  onQueue: () => void;
  onAddToPlaylist: () => void;
  onRemove: () => void;
}) {
  return (
    <Card
      className="mm-hover-lift"
      sx={{ borderRadius: 'var(--mm-radius)', display: 'flex', alignItems: 'center', p: 1.5, gap: 1.5 }}
    >
      {/* 点封面（或歌曲信息）即播放；卡片上只保留「加入播放列表」「加入歌单」两个按钮 */}
      <Box
        role="button"
        tabIndex={0}
        aria-label={`播放 ${String(song.name ?? '')}`}
        onClick={onPlay}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPlay();
          }
        }}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0, cursor: 'pointer' }}
      >
        <Box
          sx={{
            width: 52,
            height: 52,
            flexShrink: 0,
            overflow: 'hidden',
            bgcolor: 'var(--mm-sunken)',
            boxShadow: 'var(--mm-raised-sm)',
          }}
        >
          <CoverImage
            src={song.pic as string}
            alt={String(song.name ?? '封面')}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {String(song.name ?? '未知歌曲')}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {String(song.singerName ?? '未知歌手')}
            </Typography>
            {meta ? (
              <Typography variant="caption" sx={{ color: 'var(--mm-text-3)', flexShrink: 0 }} noWrap>
                · {meta}
              </Typography>
            ) : null}
          </Stack>
        </Box>
      </Box>
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="加入播放列表">
          <IconButton size="small" aria-label="加入播放列表" onClick={onQueue}>
            <QueueMusicRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="加入歌单">
          <IconButton size="small" aria-label="加入歌单" onClick={onAddToPlaylist}>
            <PlaylistAddRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="从曲库移除">
          <IconButton size="small" aria-label="从曲库移除" onClick={onRemove}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Card>
  );
}
