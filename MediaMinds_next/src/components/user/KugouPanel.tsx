'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import LyricsRoundedIcon from '@mui/icons-material/LyricsRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import AlbumRoundedIcon from '@mui/icons-material/AlbumRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { toast } from '@/lib/notify';
import { usePlayerStore } from '@/stores/playerStore';
import {
  searchKugouService,
  getKugouPlayUrlService,
  getKugouLyricService,
  importKugouSongService,
  type KugouDimension,
} from '@/api/kugou';

interface KugouSong {
  hash?: string;
  name?: string;
  singer?: string;
  album?: string;
  albumId?: string | number;
  albumAudioId?: string | number;
  image?: string;
  duration?: number;
}

interface KugouSinger {
  id?: string;
  name?: string;
}

interface KugouAlbum {
  id?: string;
  name?: string;
  singer?: string;
  songCount?: number;
  publishTime?: string;
  image?: string;
}

/** 酷狗返回结构层级不一，逐层兜底取出 */
function normalizeSong(raw: Record<string, unknown>): KugouSong {
  const audioInfo = (raw.audio_info ?? {}) as Record<string, unknown>;
  const albumInfo = (raw.album_info ?? {}) as Record<string, unknown>;
  return {
    hash:
      (raw.hash as string) ||
      (raw.hash_128 as string) ||
      (audioInfo.hash_128 as string) ||
      '',
    name: (raw.name as string) || (raw.songname as string) || (raw.filename as string) || '未知歌曲',
    singer: (raw.singer as string) || (raw.singername as string) || (raw.author_name as string) || '未知歌手',
    album: (raw.album as string) || (raw.album_name as string) || (albumInfo.album_name as string) || '',
    albumId: (raw.albumId as string) ?? (raw.album_id as string | number) ?? undefined,
    albumAudioId: (raw.albumAudioId as string) ?? (raw.album_audio_id as string | number) ?? undefined,
    image: (raw.image as string) || (raw.img as string) || '',
    duration: Number(raw.duration ?? 0) || 0,
  };
}

/** 单页条数：返回条数少于它即视为没有更多 */
const PAGE_SIZE = 30;

/**
 * 酷狗在线结果面板（**受页面工具栏驱动**）。
 *
 * 搜索关键词与维度都由外层传入——工具栏里的搜索框和筛选下拉就是它的输入，
 * 面板自己不再有搜索框，避免页面上出现两组搜索。
 */
export default function KugouPanel({
  keyword,
  dimension,
  nonce,
  onSearchByName,
  onImported,
  onAddToPlaylist,
}: {
  keyword: string;
  dimension: KugouDimension;
  /** 每次点「搜索」自增，用于强制重搜同一个关键词 */
  nonce: number;
  /** 点歌手 / 专辑时，用它的名字再搜一次歌曲 */
  onSearchByName: (name: string) => void;
  /** 导入本地后可刷新本地歌手 / 歌曲列表 */
  onImported?: () => void;
  /** 加入歌单：先把在线歌曲导入本地拿到 id，再交给外层打开歌单选择弹窗 */
  onAddToPlaylist?: (song: Record<string, unknown>) => void;
}) {
  const { play, updateCurrent } = usePlayerStore();

  const [songs, setSongs] = useState<KugouSong[]>([]);
  const [singers, setSingers] = useState<KugouSinger[]>([]);
  const [albums, setAlbums] = useState<KugouAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lyricDialog, setLyricDialog] = useState({ open: false, text: '', title: '' });
  /** 正在「导入并加入歌单」的歌曲 hash */
  const [playlistBusy, setPlaylistBusy] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  /** 搜索代号：关键词 / 维度变化时自增，用于丢弃在途的翻页响应 */
  const searchKeyRef = useRef(0);

  useEffect(() => {
    const kw = keyword.trim();
    searchKeyRef.current += 1;
    if (!kw) {
      setSongs([]);
      setSingers([]);
      setAlbums([]);
      setSearched(false);
      setPage(1);
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPage(1);
    setHasMore(false);
    setLoadingMore(false);
    (async () => {
      try {
        const res = await searchKugouService(kw, dimension, 1, PAGE_SIZE);
        if (cancelled) return;
        const data = res.data as unknown as {
          songs?: Array<Record<string, unknown>>;
          singers?: Array<Record<string, unknown>>;
          albums?: Array<Record<string, unknown>>;
        };

        if (dimension === 'singer') {
          const list = (data?.singers ?? []).map((s) => ({ id: String(s.id ?? ''), name: String(s.name ?? '') }));
          setSingers(list);
          setHasMore(list.length >= PAGE_SIZE);
        } else if (dimension === 'album') {
          const list = (data?.albums ?? []).map((a) => ({
            id: String(a.id ?? ''),
            name: String(a.name ?? ''),
            singer: String(a.singer ?? ''),
            songCount: Number(a.songCount ?? 0),
            publishTime: String(a.publishTime ?? ''),
            image: String(a.image ?? ''),
          }));
          setAlbums(list);
          setHasMore(list.length >= PAGE_SIZE);
        } else {
          const list = (data?.songs ?? []).map(normalizeSong);
          setSongs(list);
          setHasMore(list.length >= PAGE_SIZE);
        }
        setSearched(true);
      } catch {
        if (!cancelled) setSearched(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keyword, dimension, nonce]);

  /** 拉取下一页并追加（滚动到底部触发） */
  const loadMore = useCallback(async () => {
    const kw = keyword.trim();
    if (!kw || loadingMore || !hasMore) return;
    const next = page + 1;
    const myKey = searchKeyRef.current;
    setLoadingMore(true);
    try {
      const res = await searchKugouService(kw, dimension, next, PAGE_SIZE);
      if (myKey !== searchKeyRef.current) return;
      const data = res.data as unknown as {
        songs?: Array<Record<string, unknown>>;
        singers?: Array<Record<string, unknown>>;
        albums?: Array<Record<string, unknown>>;
      };
      if (dimension === 'singer') {
        const list = (data?.singers ?? []).map((s) => ({ id: String(s.id ?? ''), name: String(s.name ?? '') }));
        setSingers((prev) => [...prev, ...list]);
        setHasMore(list.length >= PAGE_SIZE);
      } else if (dimension === 'album') {
        const list = (data?.albums ?? []).map((a) => ({
          id: String(a.id ?? ''),
          name: String(a.name ?? ''),
          singer: String(a.singer ?? ''),
          songCount: Number(a.songCount ?? 0),
          publishTime: String(a.publishTime ?? ''),
          image: String(a.image ?? ''),
        }));
        setAlbums((prev) => [...prev, ...list]);
        setHasMore(list.length >= PAGE_SIZE);
      } else {
        const list = (data?.songs ?? []).map(normalizeSong);
        setSongs((prev) => [...prev, ...list]);
        setHasMore(list.length >= PAGE_SIZE);
      }
      setPage(next);
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoadingMore(false);
    }
  }, [keyword, dimension, page, loadingMore, hasMore]);

  // 列表底部哨兵进入视口 → 自动加载下一页
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '240px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  /** 列表底部状态：有下一页时挂哨兵 + 加载提示，否则「没有更多了」 */
  const renderFooter = () =>
    hasMore ? (
      <>
        <Box ref={sentinelRef} sx={{ height: 1 }} />
        {loadingMore ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            加载中…
          </Typography>
        ) : null}
      </>
    ) : (
      <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
        没有更多了
      </Typography>
    );


  const handlePlay = async (song: KugouSong) => {
    const hash = song.hash;
    if (!hash) {
      toast.error('该歌曲缺少播放信息');
      return;
    }
    try {
      const res = await getKugouPlayUrlService(
        String(hash),
        '128',
        String(song.albumAudioId ?? ''),
        String(song.albumId ?? ''),
      );
      const url = (res.data as unknown as { url?: string | string[] })?.url;
      const playUrl = Array.isArray(url) ? url[0] : url;
      if (!playUrl) {
        toast.error('该曲目需酷狗会员，暂无法获取播放地址');
        return;
      }
      // 先起播（带上封面），歌词异步补齐，避免等歌词卡住播放
      play({
        id: String(hash),
        name: song.name || '未知歌曲',
        singerName: song.singer,
        url: playUrl,
        pic: song.image || undefined,
        source: 'kugou',
        hash: String(hash),
        albumAudioId: String(song.albumAudioId ?? ''),
        albumId: String(song.albumId ?? ''),
      });
      const lyrics = await fetchLyricText(song);
      if (lyrics && String(usePlayerStore.getState().current?.id) === String(hash)) {
        updateCurrent({ lyrics });
      }
    } catch {
      /* 拦截器已提示 */
    }
  };

  const fetchLyricText = async (song: KugouSong): Promise<string> => {
    if (!song.hash) return '';
    try {
      const res = await getKugouLyricService(String(song.hash), String(song.albumAudioId ?? ''), song.name || '');
      const data = res.data as unknown as { lyrics?: string; lyric?: string } | string;
      const text = typeof data === 'string' ? data : data?.lyrics || data?.lyric || '';
      return text === '暂无歌词' ? '' : text;
    } catch {
      return '';
    }
  };

  const showLyric = async (song: KugouSong) => {
    if (!song.hash) return;
    const text = (await fetchLyricText(song)) || '暂无歌词';
    setLyricDialog({ open: true, text, title: song.name || '歌词' });
  };

  const importPayload = (song: KugouSong) => ({
    hash: String(song.hash ?? ''),
    name: song.name || '',
    singer: song.singer || '',
    album: song.album || '',
    albumId: String(song.albumId ?? ''),
    albumAudioId: String(song.albumAudioId ?? ''),
    image: song.image || '',
    duration: song.duration || 0,
  });

  /** 加入歌单：先导入本地（后端按「歌名 + 歌手」去重）拿到 song.id，再交给外层选择歌单 */
  const addSongToPlaylist = async (song: KugouSong) => {
    const hash = song.hash;
    if (!hash) {
      toast.error('该歌曲缺少导入信息');
      return;
    }
    setPlaylistBusy(hash);
    try {
      const res = await importKugouSongService(importPayload(song));
      const created = res.data as unknown as
        | { id?: number; name?: string; pic?: string }
        | undefined;
      if (res.code === 200 && created?.id != null) {
        onImported?.();
        onAddToPlaylist?.({
          id: created.id,
          name: created.name || song.name || '',
          singerName: song.singer || '',
          pic: created.pic || song.image || '',
        });
      } else {
        toast.error((res as { message?: string }).message || '导入失败');
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setPlaylistBusy(null);
    }
  };

  // ────────────────────────── 渲染 ──────────────────────────

  if (!keyword.trim()) {
    return (
      <EmptyState
        icon={<MusicNoteRoundedIcon />}
        title="在线搜索"
        description="在上面的搜索框里输入关键词，可以用歌曲 / 歌手 / 专辑三种方式检索酷狗音乐。"
        minHeight={240}
      />
    );
  }

  if (loading) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
        <Typography color="text.secondary">正在搜索酷狗音乐…</Typography>
      </Stack>
    );
  }

  if (!searched) return null;

  // 歌手
  if (dimension === 'singer') {
    if (singers.length === 0) {
      return <EmptyState icon={<PersonRoundedIcon />} title="没有找到相关歌手" description="换个关键词试试" />;
    }
    return (
      <Box>
        <List disablePadding>
          {singers.map((s, i) => (
            <ListItemButton key={`${s.id}-${i}`} onClick={() => onSearchByName(s.name || '')} sx={{ mb: 0.75, py: 1 }}>
              <ListItemAvatar>
                <Avatar variant="rounded" sx={{ bgcolor: 'var(--mm-sunken)', color: 'var(--mm-accent-text)' }}>
                  <PersonRoundedIcon fontSize="small" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={<Typography fontWeight={700}>{s.name || '未知歌手'}</Typography>} />
              <Chip size="small" label="查看歌曲" />
            </ListItemButton>
          ))}
        </List>
        {renderFooter()}
      </Box>
    );
  }

  // 专辑
  if (dimension === 'album') {
    if (albums.length === 0) {
      return <EmptyState icon={<AlbumRoundedIcon />} title="没有找到相关专辑" description="换个关键词试试" />;
    }
    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
          {albums.map((a, i) => (
            <Card
              key={`${a.id}-${i}`}
              className="mm-hover-lift"
              role="button"
              tabIndex={0}
              onClick={() => onSearchByName(a.name || '')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSearchByName(a.name || '');
                }
              }}
              sx={{ overflow: 'hidden', cursor: 'pointer' }}
            >
              <CoverImage
                src={a.image}
                alt={a.name || '专辑'}
                sx={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', bgcolor: 'var(--mm-sunken)' }}
              />
              <Box sx={{ p: 1.75 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {a.name || '未知专辑'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {a.singer || '未知歌手'}
                </Typography>
                {a.songCount ? (
                  <Typography variant="caption" color="text.secondary">
                    {a.songCount} 首
                  </Typography>
                ) : null}
              </Box>
            </Card>
          ))}
        </Box>
        {renderFooter()}
      </Box>
    );
  }

  // 歌曲
  if (songs.length === 0) {
    return <EmptyState icon={<MusicNoteRoundedIcon />} title="没有找到相关歌曲" description="换个关键词试试" />;
  }
  return (
    <>
      <List disablePadding>
        {songs.map((song, idx) => (
          <ListItem
            key={`${song.hash || song.name}-${idx}`}
            sx={{ mb: 0.75 }}
            secondaryAction={
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="播放">
                  <IconButton onClick={() => handlePlay(song)} aria-label="播放">
                    <PlayArrowRoundedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="歌词">
                  <IconButton onClick={() => showLyric(song)} aria-label="歌词">
                    <LyricsRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="加入歌单（会先导入本地）">
                  <span>
                    <IconButton
                      onClick={() => addSongToPlaylist(song)}
                      aria-label="加入歌单"
                      disabled={playlistBusy === song.hash}
                    >
                      <PlaylistAddRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            }
          >
            <ListItemAvatar>
              <Avatar variant="rounded" src={song.image || undefined}>
                <MusicNoteRoundedIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={<Typography fontWeight={600}>{song.name || '未知歌曲'}</Typography>}
              secondary={[song.singer, song.album].filter(Boolean).join(' · ') || '未知歌手'}
            />
          </ListItem>
        ))}
      </List>

      {renderFooter()}

      <Dialog open={lyricDialog.open} onClose={() => setLyricDialog((d) => ({ ...d, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{lyricDialog.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2.5, bgcolor: 'var(--mm-sunken)', boxShadow: 'var(--mm-sunken-sm)', maxHeight: 420, overflowY: 'auto' }}>
            <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.9 }}>{lyricDialog.text}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLyricDialog((d) => ({ ...d, open: false }))}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
