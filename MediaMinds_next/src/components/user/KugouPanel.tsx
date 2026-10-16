'use client';

import { useEffect, useState } from 'react';
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
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import LyricsRoundedIcon from '@mui/icons-material/LyricsRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import EmptyState from '@/components/common/EmptyState';
import { toast } from '@/lib/notify';
import { usePlayerStore } from '@/stores/playerStore';
import {
  searchKugouSongsService,
  getKugouPlayUrlService,
  getKugouLyricService,
  getKugouRankListService,
  getKugouRankAudioService,
  getKugouRankTopService,
  importKugouSongService,
} from '@/api/kugou';

interface KugouSong {
  hash?: string;
  hash_128?: string;
  name?: string;
  singer?: string;
  album?: string;
  albumId?: string | number;
  albumAudioId?: string | number;
  audioId?: string | number;
  image?: string;
  duration?: number;
  // 兼容旧字段
  audio_id?: number;
  album_audio_id?: number;
  album_id?: number;
  filename?: string;
  songname?: string;
  singername?: string;
  [key: string]: unknown;
}

interface KugouRank {
  rankId: string;
  rankName: string;
  rankCid: number;
  image?: string;
}

/** 把搜索/榜单接口的歌曲统一成前端可用结构 */
function normalizeKugouSong(raw: Record<string, unknown>): KugouSong {
  const s = raw as KugouSong;
  const audioInfo = (raw.audio_info ?? {}) as Record<string, unknown>;
  const albumInfo = (raw.album_info ?? {}) as Record<string, unknown>;
  const hash =
    (s.hash as string) ||
    (s.hash_128 as string) ||
    (audioInfo.hash_128 as string) ||
    (audioInfo.hash_320 as string) ||
    (audioInfo.hash_flac as string) ||
    '';
  return {
    hash,
    name: (s.name as string) || (s.songname as string) || (s.filename as string) || '未知歌曲',
    singer: (s.singer as string) || (s.singername as string) || (raw.author_name as string) || '未知歌手',
    album: (s.album as string) || (albumInfo.album_name as string) || '',
    albumId: (s.albumId as string) ?? (s.album_id as number) ?? (raw.album_id as number),
    albumAudioId: (s.albumAudioId as string) ?? (s.album_audio_id as number) ?? (raw.album_audio_id as number),
    audioId: (s.audioId as string) ?? (s.audio_id as number) ?? (raw.audio_id as number),
    image:
      (s.image as string) ||
      (albumInfo.sizable_cover as string) ||
      (raw.cover as string) ||
      '',
    duration: (s.duration as number) || Number(raw.duration ?? 0) || 0,
  };
}

/** 榜单列表归一化：rank/top 在 data.list，rank/list 在 data.info */
function normalizeRanks(res: unknown, path: 'list' | 'info'): KugouRank[] {
  const d = (res as { data?: unknown })?.data as Record<string, unknown> | undefined;
  const inner = (d?.data ?? {}) as Record<string, unknown>;
  const arr = inner[path];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      const r = item as Record<string, unknown>;
      const rankId = r.rankid ?? r.rankId ?? r.id;
      if (rankId == null) return null;
      return {
        rankId: String(rankId),
        rankName: String(r.rankname ?? r.rankName ?? '榜单'),
        rankCid: Number(r.rank_cid ?? r.rankCid ?? 0),
        image: String(r.img_9 ?? r.banner_9 ?? r.img ?? ''),
      } as KugouRank;
    })
    .filter((x): x is KugouRank => x !== null);
}

export default function KugouPanel() {
  const { play } = usePlayerStore();
  const [tab, setTab] = useState<'search' | 'rank'>('search');
  const [keyword, setKeyword] = useState('');
  const [songs, setSongs] = useState<KugouSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [ranks, setRanks] = useState<KugouRank[]>([]);
  const [rankSongs, setRankSongs] = useState<KugouSong[]>([]);
  const [activeRank, setActiveRank] = useState<KugouRank | null>(null);
  const [lyricDialog, setLyricDialog] = useState<{ open: boolean; text: string; title: string }>({
    open: false,
    text: '',
    title: '',
  });

  useEffect(() => {
    if (tab !== 'rank') return;
    (async () => {
      try {
        const [top, list] = await Promise.all([getKugouRankTopService(), getKugouRankListService()]);
        setRanks([...normalizeRanks(top, 'list'), ...normalizeRanks(list, 'info')]);
      } catch {
        setRanks([]);
      }
    })();
  }, [tab]);

  const search = async () => {
    if (!keyword.trim()) {
      toast.warning('请输入搜索关键词');
      return;
    }
    setLoading(true);
    try {
      const res = await searchKugouSongsService(keyword, 1, 30);
      const data = res.data as unknown as { songs?: Array<Record<string, unknown>> } | undefined;
      const list = Array.isArray(data?.songs) ? data!.songs : [];
      setSongs(list.map(normalizeKugouSong));
    } finally {
      setLoading(false);
    }
  };

  const loadRank = async (rank: KugouRank) => {
    setActiveRank(rank);
    setLoading(true);
    try {
      const res = await getKugouRankAudioService(String(rank.rankId), Number(rank.rankCid ?? 0), 1, 30);
      const data = res.data as unknown as { data?: { songlist?: Array<Record<string, unknown>> } } | undefined;
      const list = Array.isArray(data?.data?.songlist) ? data!.data!.songlist : [];
      setRankSongs(list.map(normalizeKugouSong));
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (song: KugouSong) => {
    const hash = song.hash || song.hash_128;
    if (!hash) {
      toast.error('该歌曲缺少播放信息');
      return;
    }
    try {
      const res = await getKugouPlayUrlService(String(hash), '128', String(song.albumAudioId ?? ''), String(song.albumId ?? ''));
      const url = (res.data as unknown as { url?: string | string[] })?.url;
      const playUrl = Array.isArray(url) ? url[0] : url;
      if (!playUrl) {
        toast.error('该曲目需酷狗会员，暂无法获取播放地址');
        return;
      }
      play({
        id: String(hash),
        name: song.name || '未知歌曲',
        singerName: song.singer,
        url: playUrl,
        source: 'kugou',
        hash: String(hash),
        albumAudioId: String(song.albumAudioId ?? ''),
        albumId: String(song.albumId ?? ''),
      });
    } catch {
      /* ignore */
    }
  };

  const showLyric = async (song: KugouSong) => {
    const hash = song.hash || song.hash_128;
    if (!hash) return;
    const res = await getKugouLyricService(String(hash), String(song.albumAudioId ?? ''), keyword);
    const data = res.data as unknown as { lyrics?: string; lyric?: string } | string;
    const text = typeof data === 'string' ? data : data?.lyrics || data?.lyric || '暂无歌词';
    setLyricDialog({ open: true, text, title: song.name || '歌词' });
  };

  const importSong = async (song: KugouSong) => {
    const hash = song.hash || song.hash_128;
    if (!hash) return;
    const res = await importKugouSongService({
      hash: String(hash),
      name: song.name || '',
      singer: song.singer || '',
      album: song.album || '',
      albumId: String(song.albumId ?? ''),
      albumAudioId: String(song.albumAudioId ?? ''),
      image: song.image || '',
      duration: song.duration || 0,
    });
    if (res.code === 200) {
      toast.success('已导入本地曲库');
    } else {
      toast.error((res as { message?: string }).message || '导入失败（需要管理员权限）');
    }
  };

  const renderSong = (song: KugouSong, idx: number) => (
    <ListItem
      key={`${song.hash || song.name}-${idx}`}
      secondaryAction={
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="播放">
            <IconButton onClick={() => handlePlay(song)}>
              <PlayArrowRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="歌词">
            <IconButton onClick={() => showLyric(song)}>
              <LyricsRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="导入本地曲库">
            <IconButton onClick={() => importSong(song)}>
              <DownloadRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      <ListItemAvatar>
        <Avatar variant="rounded">
          <MusicNoteRoundedIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={<Typography fontWeight={600}>{song.name || '未知歌曲'}</Typography>}
        secondary={song.singer || '未知歌手'}
      />
    </ListItem>
  );

  return (
    <Box>
      <Card sx={{ p: 2.5, mb: 3.5, borderRadius: 'var(--mm-radius-lg)' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5 }}>
          <Tab value="search" label="在线搜索" />
          <Tab value="rank" label="排行榜" />
        </Tabs>
        {tab === 'search' && (
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="搜索歌曲、歌手"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
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
            <Button variant="contained" onClick={search} disabled={loading}>
              搜索
            </Button>
          </Stack>
        )}
      </Card>

      {tab === 'search' ? (
        songs.length === 0 ? (
          <EmptyState icon={<SearchRoundedIcon sx={{ fontSize: 64 }} />} title="搜索酷狗音乐" description="输入关键词开始搜索" />
        ) : (
          <Card sx={{ borderRadius: 'var(--mm-radius-lg)' }}>
            <List>{songs.map(renderSong)}</List>
          </Card>
        )
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Card sx={{ borderRadius: 'var(--mm-radius-lg)', p: 1.5, minWidth: 240, height: 'fit-content' }}>
            <List>
              {ranks.map((r) => (
                <ListItemButton
                  key={r.rankId}
                  selected={activeRank?.rankId === r.rankId}
                  onClick={() => loadRank(r)}
                  sx={{ borderRadius: 'var(--mm-radius-sm)' }}
                >
                  <ListItemText primary={r.rankName} />
                </ListItemButton>
              ))}
            </List>
          </Card>
          <Box sx={{ flex: 1 }}>
            {rankSongs.length === 0 ? (
              <EmptyState icon={<MusicNoteRoundedIcon sx={{ fontSize: 64 }} />} title="选择一个榜单查看歌曲" />
            ) : (
              <Card sx={{ borderRadius: 'var(--mm-radius-lg)' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    {activeRank?.rankName ?? '榜单歌曲'}
                  </Typography>
                  <List>{rankSongs.map(renderSong)}</List>
                </CardContent>
              </Card>
            )}
          </Box>
        </Stack>
      )}

      <Dialog open={lyricDialog.open} onClose={() => setLyricDialog((s) => ({ ...s, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{lyricDialog.title}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              maxHeight: 400,
              overflowY: 'auto',
              p: 2.5,
              borderRadius: 'var(--mm-radius)',
              bgcolor: 'var(--mm-sunken)',
              boxShadow: 'var(--mm-sunken-sm)',
            }}
          >
            {lyricDialog.text}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLyricDialog((s) => ({ ...s, open: false }))}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
