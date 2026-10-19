'use client';

import { useRouter } from 'next/navigation';
import { Avatar, IconButton, Stack, Tooltip } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import { usePlayerStore } from '@/stores/playerStore';

/**
 * 播放器控制条（单行）。
 *
 * <p>专辑封面可点击进入**播放界面**（不额外加按钮）；上一首 / 播放暂停 / 下一首。
 * 音频由全局唯一的 `AudioEngine` 驱动，所以这里可以同时挂在桌面侧边栏与移动端贴底条上。
 */
export default function GlobalMusicPlayer() {
  const router = useRouter();

  const playlist = usePlayerStore((s) => s.playlist);
  const current = usePlayerStore((s) => s.current);
  const playing = usePlayerStore((s) => s.playing);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);

  if (playlist.length === 0) return null;

  const trackLabel = current ? `${current.name} · ${current.singerName || '未知歌手'}` : '播放列表';

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, width: '100%' }}>
      <Tooltip title={`${trackLabel}（点击进入播放界面）`}>
        <IconButton
          onClick={() => router.push('/content/music/playing')}
          aria-label={`${trackLabel}，打开播放界面`}
          sx={{ p: 0, width: 44, height: 44, flexShrink: 0, overflow: 'hidden' }}
        >
          <Avatar
            variant="rounded"
            src={current?.pic || undefined}
            sx={{ width: 44, height: 44, bgcolor: 'var(--mm-sunken)', color: 'var(--mm-accent-text)' }}
          >
            <MusicNoteRoundedIcon fontSize="small" />
          </Avatar>
        </IconButton>
      </Tooltip>

      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        justifyContent="center"
        sx={{ flex: 1, minWidth: 0 }}
      >
        <IconButton size="small" onClick={prev} aria-label="上一首">
          <SkipPreviousRoundedIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? '暂停' : '播放'}
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            bgcolor: 'var(--mm-accent)',
            color: 'var(--mm-accent-contrast)',
            '&:hover': { bgcolor: 'var(--mm-accent-hover)', color: 'var(--mm-accent-contrast)' },
          }}
        >
          {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
        </IconButton>
        <IconButton size="small" onClick={next} aria-label="下一首">
          <SkipNextRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}
