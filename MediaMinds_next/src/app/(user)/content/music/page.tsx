'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import LyricsRoundedIcon from '@mui/icons-material/LyricsRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import KugouPanel from '@/components/user/KugouPanel';
import EmptyState from '@/components/common/EmptyState';
import AutoGrid from '@/components/common/AutoGrid';
import CoverImage from '@/components/common/CoverImage';
import { getRecent, relativeTime, type RecentItem } from '@/lib/recent';
import { toast } from '@/lib/notify';
import { normalizePage } from '@/lib/page';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore, type Track } from '@/stores/playerStore';
import {
  getAllSongsService,
  getSongByNameService,
  getAllSingersService,
  getAllSongListsService,
  getSongListByLikeTitleService,
  getListSongBySongListIdService,
  getUserCollectionsService,
  addCollectionService,
  deleteCollectionService,
  addCommentService,
  getCommentsService,
  likeCommentService,
} from '@/api/music';

type TabKey = 'recent' | 'songs' | 'songlists' | 'favorites' | 'kugou';
type RecentMode = 'added' | 'watched';

const PAGE_SIZE = 12;

/** 「最近添加」一眼看完，不分页 */
const RECENT_SIZE = 24;

export default function MusicViewPage() {
  const userId = useAuthStore((s) => s.info?.userId) || 0;
  const { current, playing, play, addToPlaylist, playList, setPlaying } = usePlayerStore();

  const [tab, setTab] = useState<TabKey>('recent');
  const [recentMode, setRecentMode] = useState<RecentMode>('added');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const [songs, setSongs] = useState<Record<string, unknown>[]>([]);
  const [recentAdded, setRecentAdded] = useState<Record<string, unknown>[]>([]);
  const [recentWatched, setRecentWatched] = useState<RecentItem[]>([]);
  const [singers, setSingers] = useState<Record<string, unknown>[]>([]);
  const [songLists, setSongLists] = useState<Record<string, unknown>[]>([]);
  const [collections, setCollections] = useState<Record<string, unknown>[]>([]);

  const [lyricDialog, setLyricDialog] = useState<{ open: boolean; song?: Record<string, unknown> }>({ open: false });

  const [commentDialog, setCommentDialog] = useState<{ open: boolean; song?: Record<string, unknown> }>({ open: false });
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [commentText, setCommentText] = useState('');

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      const res = keyword ? await getSongByNameService(keyword, { pageNum: 1, pageSize: PAGE_SIZE }) : await getAllSongsService({ pageNum: 1, pageSize: PAGE_SIZE });
      setSongs(normalizePage<Record<string, unknown>>(res).rows);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

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

  const fetchSongLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = keyword ? await getSongListByLikeTitleService(keyword, { pageNum: 1, pageSize: PAGE_SIZE }) : await getAllSongListsService({ pageNum: 1, pageSize: PAGE_SIZE });
      setSongLists(normalizePage<Record<string, unknown>>(res).rows);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUserCollectionsService({ pageNum: 1, pageSize: 50 });
      setCollections(normalizePage<Record<string, unknown>>(res).rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'recent') {
      if (recentMode === 'added') {
        fetchRecentAdded();
      } else {
        // 最近观看走本地记录，不需要请求后端
        setRecentWatched(getRecent('music'));
      }
    } else if (tab === 'songs') fetchSongs();
    else if (tab === 'songlists') fetchSongLists();
    else if (tab === 'favorites') fetchCollections();
  }, [tab, recentMode, fetchSongs, fetchRecentAdded, fetchSongLists, fetchCollections]);

  // 歌手名映射：进入页面即预取，供歌曲列表补全 singerName
  useEffect(() => {
    fetchSingers();
  }, [fetchSingers]);

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
    }),
    [singerNameById],
  );

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

  /** 「最近」Tab 的列表：最近添加取后端，最近观看取本地记录 */
  const displayRecent = useMemo<Record<string, unknown>[]>(() => {
    if (recentMode === 'watched') {
      // 本地记录只有卡片快照，把「最近时间」作为 meta 展示
      return recentWatched.map((r) => ({
        id: Number(r.id),
        name: r.title,
        singerName: r.subtitle || '未知歌手',
        pic: r.cover,
        recentAt: relativeTime(r.at),
      }));
    }
    return recentAdded.map(withSinger);
  }, [recentMode, recentWatched, recentAdded, withSinger]);

  const currentIsPlaying = (id: unknown) => String(current?.id) === String(id) && playing;

  const handlePlay = (song: Record<string, unknown>) => {
    if (String(current?.id) === String(song.id)) {
      setPlaying(!playing);
      return;
    }
    play(toTrack(song));
  };

  const favoriteIds = useMemo(
    () => collections.map((c) => String(c.songId ?? c.id)),
    [collections],
  );

  const toggleFavorite = async (song: Record<string, unknown>) => {
    const sid = Number(song.id);
    if (favoriteIds.includes(String(sid))) {
      const res = await deleteCollectionService(sid);
      if (res.code === 200) {
        toast.success('已取消收藏');
        fetchCollections();
      }
    } else {
      const res = await addCollectionService('0', sid);
      if (res.code === 200) {
        toast.success('收藏成功');
        fetchCollections();
      }
    }
  };

  const playSongList = async (list: Record<string, unknown>) => {
    try {
      const res = await getListSongBySongListIdService(String(list.id), { pageNum: 1, pageSize: 100 });
      const rows = normalizePage<Record<string, unknown>>(res).rows;
      const tracks = rows.map((s) => toTrack((s.song as Record<string, unknown>) ?? s));
      if (tracks.length) {
        playList(tracks);
        toast.success(`开始播放《${list.title}》`);
      } else {
        toast.warning('该歌单暂无歌曲');
      }
    } catch {
      /* ignore */
    }
  };

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
          <Tabs
            value={tab}
            variant="scrollable"
            scrollButtons={false}
            onChange={(_, v) => {
              setTab(v);
              setKeyword('');
            }}
          >
            <Tab value="recent" label="最近" />
            <Tab value="songs" label="全部" />
            <Tab value="songlists" label="歌单" />
            <Tab value="favorites" label="收藏" />
            <Tab value="kugou" label="酷狗搜索" />
          </Tabs>
          <Box sx={{ flex: 1 }} />
          {/* 「最近」的两种口径 */}
          {tab === 'recent' && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={recentMode}
              onChange={(_, v) => v && setRecentMode(v as RecentMode)}
            >
              <ToggleButton value="added">最近添加</ToggleButton>
              <ToggleButton value="watched">最近观看</ToggleButton>
            </ToggleButtonGroup>
          )}
          {(tab === 'songs' || tab === 'songlists') && (
            <TextField
              size="small"
              placeholder={tab === 'songs' ? '搜索歌曲名称' : '搜索歌单标题'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (tab === 'songs' ? fetchSongs() : fetchSongLists())}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: 240 }}
            />
          )}
        </Stack>
      </Card>

      {tab === 'kugou' ? (
        <KugouPanel />
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
        songs.length === 0 ? (
          <EmptyState icon={<HeadphonesRoundedIcon sx={{ fontSize: 64 }} />} title="暂无歌曲" />
        ) : (
          <AutoGrid minWidth={300}>
            {songs.map((s) => (
              <SongRow
                key={String(s.id)}
                song={withSinger(s)}
                playing={currentIsPlaying(s.id)}
                favorite={favoriteIds.includes(String(s.id))}
                onPlay={() => handlePlay(s)}
                onQueue={() => {
                  addToPlaylist(toTrack(s));
                  toast.success('已加入播放列表');
                }}
                onFavorite={() => toggleFavorite(s)}
                onLyric={() => openLyric(s)}
                onComment={() => openComments(s)}
              />
            ))}
          </AutoGrid>
        )
      ) : tab === 'recent' ? (
        displayRecent.length === 0 ? (
          <EmptyState
            icon={<HeadphonesRoundedIcon sx={{ fontSize: 64 }} />}
            title={recentMode === 'added' ? '暂无歌曲' : '暂无收听记录'}
            description={recentMode === 'added' ? undefined : '播放过的歌曲会出现在这里'}
          />
        ) : (
          <AutoGrid minWidth={300}>
            {displayRecent.map((s) => (
              <SongRow
                key={String(s.id)}
                song={s}
                meta={s.recentAt as string}
                playing={currentIsPlaying(s.id)}
                favorite={favoriteIds.includes(String(s.id))}
                onPlay={() => handlePlay(s)}
                onQueue={() => {
                  addToPlaylist(toTrack(s));
                  toast.success('已加入播放列表');
                }}
                onFavorite={() => toggleFavorite(s)}
                onLyric={() => openLyric(s)}
                onComment={() => openComments(s)}
              />
            ))}
          </AutoGrid>
        )
      ) : tab === 'songlists' ? (
        songLists.length === 0 ? (
          <EmptyState icon={<QueueMusicRoundedIcon sx={{ fontSize: 64 }} />} title="暂无歌单" />
        ) : (
          <AutoGrid minWidth={260}>
            {songLists.map((l) => (
              <Card key={String(l.id)} className="mm-hover-lift" sx={{ borderRadius: 'var(--mm-radius-lg)', overflow: 'hidden' }}>
                <Box sx={{ position: 'relative' }}>
                  <CoverImage
                    src={l.img as string}
                    alt={String(l.title)}
                    sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block', bgcolor: 'var(--mm-sunken)' }}
                  />
                  <IconButton
                    onClick={() => playSongList(l)}
                    aria-label="播放歌单"
                    sx={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      bgcolor: 'var(--mm-bg)',
                      color: 'var(--mm-accent-text)',
                      boxShadow: 'var(--mm-float)',
                      '&:hover': { bgcolor: 'var(--mm-bg)', color: 'var(--mm-accent-text)' },
                    }}
                  >
                    <PlayArrowRoundedIcon />
                  </IconButton>
                </Box>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {String(l.title ?? '')}
                  </Typography>
                  {l.style ? <Chip label={String(l.style)} size="small" sx={{ mt: 0.5 }} /> : null}
                </CardContent>
              </Card>
            ))}
          </AutoGrid>
        )
      ) : collections.length === 0 ? (
        <EmptyState icon={<FavoriteBorderRoundedIcon sx={{ fontSize: 64 }} />} title="暂无收藏" description="在歌曲中点击心形按钮即可收藏" />
      ) : (
        <AutoGrid minWidth={300}>
          {collections.map((c) => {
            const song = (c.song as Record<string, unknown>) ?? c;
            return (
              <SongRow
                key={String(c.id ?? c.songId)}
                song={withSinger(song)}
                playing={currentIsPlaying(song.id)}
                favorite
                onPlay={() => handlePlay(song)}
                onQueue={() => addToPlaylist(toTrack(song))}
                onFavorite={() => toggleFavorite(song)}
                onLyric={() => openLyric(song)}
                onComment={() => openComments(song)}
              />
            );
          })}
        </AutoGrid>
      )}

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
    </Box>
  );
}

function SongRow({
  song,
  meta,
  playing,
  favorite,
  onPlay,
  onQueue,
  onFavorite,
  onLyric,
  onComment,
}: {
  song: Record<string, unknown>;
  meta?: string;
  playing: boolean;
  favorite: boolean;
  onPlay: () => void;
  onQueue: () => void;
  onFavorite: () => void;
  onLyric: () => void;
  onComment: () => void;
}) {
  const { mm } = useTheme();
  return (
    <Card
      className="mm-hover-lift"
      sx={{ borderRadius: 'var(--mm-radius)', display: 'flex', alignItems: 'center', p: 1.5, gap: 1.5 }}
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
      <Stack direction="row" spacing={0.25}>
        <Tooltip title={playing ? '暂停' : '播放'}>
          <IconButton size="small" aria-label={playing ? '暂停' : '播放'} onClick={onPlay}>
            {playing ? <PauseRoundedIcon color="primary" /> : <PlayArrowRoundedIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="加入播放列表">
          <IconButton size="small" aria-label="加入播放列表" onClick={onQueue}>
            <QueueMusicRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="歌词">
          <IconButton size="small" aria-label="歌词" onClick={onLyric}>
            <LyricsRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="评论">
          <IconButton size="small" aria-label="评论" onClick={onComment}>
            <ChatBubbleOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={favorite ? '取消收藏' : '收藏'}>
          <IconButton size="small" aria-label={favorite ? '取消收藏' : '收藏'} onClick={onFavorite}>
            {favorite ? (
              <FavoriteRoundedIcon fontSize="small" sx={{ color: mm.warning }} />
            ) : (
              <FavoriteBorderRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Stack>
    </Card>
  );
}
