'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import PlaylistRemoveRoundedIcon from '@mui/icons-material/PlaylistRemoveRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import EmptyState from '@/components/common/EmptyState';
import CoverImage from '@/components/common/CoverImage';
import { toast } from '@/lib/notify';
import { normalizePage } from '@/lib/page';
import { usePlayerStore, type Track } from '@/stores/playerStore';
import {
  deleteCollectionService,
  getListSongBySongListIdService,
  getUserCollectionsService,
  removeSongFromSongListService,
} from '@/api/music';
import { refreshKugouSongUrlService } from '@/api/kugou';

/** 歌单详情：展示歌曲列表，可播放 / 加入播放队列 / 从歌单移除 */
export default function PlaylistSongsDialog({
  open,
  favorite,
  songList,
  singerNameById,
  onClose,
  onChanged,
}: {
  open: boolean;
  favorite: boolean;
  songList: Record<string, unknown> | null;
  singerNameById: Map<string, string>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { mm } = useTheme();
  const { current, playing, play, addToPlaylist, setPlaying } = usePlayerStore();
  const [songs, setSongs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setSongs([]);
    (async () => {
      try {
        const res = favorite
          ? await getUserCollectionsService({ pageNum: 1, pageSize: 500 })
          : songList?.id != null
            ? await getListSongBySongListIdService(Number(songList.id), { pageNum: 1, pageSize: 500 })
            : null;
        if (!cancelled && res) {
          setSongs(normalizePage<Record<string, unknown>>(res).rows);
        }
      } catch {
        if (!cancelled) setSongs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, favorite, songList]);

  const toTrack = (s: Record<string, unknown>): Track => ({
    id: (s.id as number) || crypto.randomUUID(),
    name: String(s.name ?? '未知歌曲'),
    url: s.url as string,
    pic: s.pic as string,
    singerId: s.singerId as number,
    singerName:
      (s.singerName as string) || singerNameById.get(String(s.singerId)) || '未知歌手',
    lyrics: s.lyric as string,
    hash: (s.kugouHash as string) || undefined,
    albumId: (s.kugouAlbumId as string) || undefined,
    albumAudioId: (s.kugouAlbumAudioId as string) || undefined,
    source: s.kugouHash ? 'kugou' : 'local',
  });

  const handlePlay = async (song: Record<string, unknown>) => {
    let playable = song;
    // 酷狗直链会过期：播放前按 hash 重新取一次
    if (song.kugouHash) {
      try {
        const res = await refreshKugouSongUrlService(Number(song.id));
        if (res.code === 200 && typeof res.data === 'string' && res.data) {
          playable = { ...song, url: res.data };
        }
      } catch {
        /* 刷新失败就用已有 url */
      }
    }
    if (!playable.url) {
      toast.error('暂时拿不到播放地址，可能需要先登录酷狗或该曲目需要会员');
      return;
    }
    if (String(current?.id) === String(playable.id)) {
      setPlaying(!playing);
      return;
    }
    play(toTrack(playable));
  };

  const remove = async (song: Record<string, unknown>) => {
    const songId = Number(song.id);
    if (!songId) return;
    setRemovingId(songId);
    try {
      const res = favorite
        ? await deleteCollectionService(songId)
        : songList?.id != null
          ? await removeSongFromSongListService(Number(songList.id), songId)
          : null;
      if (res && res.code === 200) {
        toast.success(favorite ? '已取消收藏' : '已从歌单移除');
        setSongs((prev) => prev.filter((s) => Number(s.id) !== songId));
        onChanged();
      }
    } catch {
      /* 拦截器已提示 */
    } finally {
      setRemovingId(null);
    }
  };

  const title = favorite ? '我的收藏' : String(songList?.title ?? '歌单');
  const subtitle = favorite ? '收藏 · 特殊歌单' : [songList?.style, songList?.introduction].filter(Boolean).join(' · ');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pt: 2.5 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              flexShrink: 0,
              overflow: 'hidden',
              bgcolor: 'var(--mm-sunken)',
              boxShadow: 'var(--mm-sunken-sm)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {favorite ? (
              <FavoriteRoundedIcon sx={{ fontSize: 34, color: mm.warning }} />
            ) : songList?.pic ? (
              <CoverImage
                src={String(songList.pic)}
                alt={title}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <LibraryMusicRoundedIcon sx={{ fontSize: 34 }} />
            )}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {subtitle || '歌单'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {loading ? '加载中…' : `${songs.length} 首`}
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <EmptyState icon={<CircularProgress size={32} />} title="正在加载歌曲…" minHeight={180} />
        ) : songs.length === 0 ? (
          <EmptyState
            icon={<LibraryMusicRoundedIcon />}
            title="歌单还是空的"
            description={favorite ? '在歌曲上点歌单按钮，把喜欢的歌加入收藏' : '在歌曲上点歌单按钮，选择这个歌单'}
            minHeight={180}
          />
        ) : (
          <List sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {songs.map((song) => {
              const songId = Number(song.id);
              const isPlaying = String(current?.id) === String(song.id) && playing;
              return (
                <ListItem
                  key={String(songId)}
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title={isPlaying ? '暂停' : '播放'}>
                        <IconButton size="small" aria-label={isPlaying ? '暂停' : '播放'} onClick={() => handlePlay(song)}>
                          {isPlaying ? <PauseRoundedIcon color="primary" /> : <PlayArrowRoundedIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="加入播放队列">
                        <IconButton
                          size="small"
                          aria-label="加入播放队列"
                          onClick={() => {
                            addToPlaylist(toTrack(song));
                            toast.success('已加入播放列表');
                          }}
                        >
                          <QueueMusicRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={favorite ? '取消收藏' : '从歌单移除'}>
                        <span>
                          <IconButton
                            size="small"
                            aria-label={favorite ? '取消收藏' : '从歌单移除'}
                            disabled={removingId === songId}
                            onClick={() => remove(song)}
                          >
                            <PlaylistRemoveRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  }
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      mr: 1.5,
                      flexShrink: 0,
                      overflow: 'hidden',
                      bgcolor: 'var(--mm-sunken)',
                    }}
                  >
                    <CoverImage
                      src={song.pic as string}
                      alt={String(song.name ?? '')}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                  <ListItemText
                    primary={String(song.name ?? '未知歌曲')}
                    secondary={(song.singerName as string) || singerNameById.get(String(song.singerId)) || '未知歌手'}
                    slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
