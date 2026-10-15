'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
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
  Rating,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
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
import PageHeader from '@/components/common/PageHeader';
import KugouPanel from '@/components/user/KugouPanel';
import EmptyState from '@/components/common/EmptyState';
import AutoGrid from '@/components/common/AutoGrid';
import { toast } from '@/lib/notify';
import { normalizePage } from '@/lib/page';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore, type Track } from '@/stores/playerStore';
import {
  getAllSongsService,
  getSongByNameService,
  getSongsBySingerNameService,
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

type TabKey = 'songs' | 'singers' | 'songlists' | 'favorites' | 'kugou';

const PAGE_SIZE = 12;

export default function MusicViewPage() {
  const userId = useAuthStore((s) => s.info?.userId) || 0;
  const { current, playing, play, addToPlaylist, playList, setPlaying } = usePlayerStore();

  const [tab, setTab] = useState<TabKey>('songs');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const [songs, setSongs] = useState<Record<string, unknown>[]>([]);
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

  const fetchSingers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllSingersService({ pageNum: 1, pageSize: 500 });
      setSingers(normalizePage<Record<string, unknown>>(res).rows);
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
    if (tab === 'songs') fetchSongs();
    else if (tab === 'singers') fetchSingers();
    else if (tab === 'songlists') fetchSongLists();
    else if (tab === 'favorites') fetchCollections();
  }, [tab, fetchSongs, fetchSingers, fetchSongLists, fetchCollections]);

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
      <PageHeader title="音乐浏览" subtitle="聆听声音画廊，在线播放与歌词同步" icon={<HeadphonesRoundedIcon />} />

      <Card sx={{ p: 2.5, mb: 3, borderRadius: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v);
              setKeyword('');
            }}
            sx={{ minHeight: 44 }}
          >
            <Tab value="songs" label="全部歌曲" />
            <Tab value="singers" label="歌手" />
            <Tab value="songlists" label="歌单" />
            <Tab value="favorites" label="我的收藏" />
            <Tab value="kugou" label="酷狗搜索" />
          </Tabs>
          <Box sx={{ flex: 1 }} />
          {tab !== 'singers' && tab !== 'favorites' && tab !== 'kugou' && (
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
            <Card key={i} sx={{ borderRadius: 4 }}>
              <Skeleton variant="rectangular" height={140} />
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
      ) : tab === 'singers' ? (
        singers.length === 0 ? (
          <EmptyState icon={<HeadphonesRoundedIcon sx={{ fontSize: 64 }} />} title="暂无歌手" />
        ) : (
          <AutoGrid minWidth={220}>
            {singers.map((sg) => (
              <Card key={String(sg.id)} className="mm-hover-lift" sx={{ borderRadius: 4, textAlign: 'center' }}>
                <CardActionArea
                  onClick={async () => {
                    const res = await getSongsBySingerNameService(String(sg.name), { pageNum: 1, pageSize: 50 });
                    const rows = normalizePage<Record<string, unknown>>(res).rows;
                    if (rows.length) {
                      playList(rows.map(toTrack));
                      toast.success(`开始播放 ${sg.name} 的歌曲`);
                    } else toast.warning('该歌手暂无歌曲');
                  }}
                >
                  <CardContent>
                    <Avatar src={(sg.avatar as string) || undefined} sx={{ width: 88, height: 88, mx: 'auto', mb: 1.5 }}>
                      {(String(sg.name ?? '歌'))[0]}
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {String(sg.name ?? '')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[sg.sex, sg.location].filter(Boolean).join(' · ') || '歌手'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </AutoGrid>
        )
      ) : tab === 'songlists' ? (
        songLists.length === 0 ? (
          <EmptyState icon={<QueueMusicRoundedIcon sx={{ fontSize: 64 }} />} title="暂无歌单" />
        ) : (
          <AutoGrid minWidth={260}>
            {songLists.map((l) => (
              <Card key={String(l.id)} className="mm-hover-lift" sx={{ borderRadius: 4, overflow: 'hidden' }}>
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={(l.img as string) || '/cover.jpg'}
                    alt={String(l.title)}
                    sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                  />
                  <IconButton
                    onClick={() => playSongList(l)}
                    sx={{ position: 'absolute', bottom: 10, right: 10, bgcolor: 'rgba(255,255,255,.92)', '&:hover': { bgcolor: '#fff' } }}
                  >
                    <PlayArrowRoundedIcon color="primary" />
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
              p: 2,
              borderRadius: 3,
              bgcolor: 'action.hover',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
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
  playing,
  favorite,
  onPlay,
  onQueue,
  onFavorite,
  onLyric,
  onComment,
}: {
  song: Record<string, unknown>;
  playing: boolean;
  favorite: boolean;
  onPlay: () => void;
  onQueue: () => void;
  onFavorite: () => void;
  onLyric: () => void;
  onComment: () => void;
}) {
  return (
    <Card sx={{ borderRadius: 3, display: 'flex', alignItems: 'center', p: 1.25, gap: 1.5 }}>
      <Avatar variant="rounded" src={(song.pic as string) || undefined} sx={{ width: 52, height: 52 }}>
        {(String(song.name ?? '歌'))[0]}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={700} noWrap>
          {String(song.name ?? '未知歌曲')}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {String(song.singerName ?? '未知歌手')}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.25}>
        <Tooltip title={playing ? '暂停' : '播放'}>
          <IconButton size="small" onClick={onPlay}>
            {playing ? <PauseRoundedIcon color="primary" /> : <PlayArrowRoundedIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="加入播放列表">
          <IconButton size="small" onClick={onQueue}>
            <QueueMusicRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="歌词">
          <IconButton size="small" onClick={onLyric}>
            <LyricsRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="评论">
          <IconButton size="small" onClick={onComment}>
            <ChatBubbleOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={favorite ? '取消收藏' : '收藏'}>
          <IconButton size="small" onClick={onFavorite}>
            {favorite ? <FavoriteRoundedIcon fontSize="small" color="secondary" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>
    </Card>
  );
}
