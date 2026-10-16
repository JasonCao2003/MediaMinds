'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { pushRecent } from '@/lib/recent';

/**
 * 音频引擎：整个应用**只有这一个 `<audio>` 元素**。
 *
 * 之所以把它从播放器 UI 里抽出来：播放器 UI 需要同时出现在
 * 「桌面侧边栏」和「移动端贴底条」两处，如果 `<audio>` 跟着 UI 走就会有两份，
 * 导致同一首歌被播放两次。抽离之后播放器 UI 变成**无状态纯展示**，可以安全复用。
 */
export default function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = usePlayerStore((s) => s.current);
  const playing = usePlayerStore((s) => s.playing);
  const next = usePlayerStore((s) => s.next);
  const setPlaying = usePlayerStore((s) => s.setPlaying);

  // 音乐消费时长：只有真正在播放时才计时（暂停 / 切走标签页都不计）
  useActivityTracker('music', playing && Boolean(current?.url));

  // 记入「最近收听」（本地记录，供音乐页的「最近观看」使用）
  useEffect(() => {
    if (!playing || current?.id === undefined || current?.id === null) return;
    pushRecent('music', {
      id: current.id,
      title: current.name || '未命名',
      subtitle: current.singerName,
      cover: current.pic,
    });
  }, [playing, current]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.url) return;
    if (audio.src !== current.url) {
      audio.src = current.url;
      audio.load();
    }
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [current, playing, setPlaying]);

  return <audio ref={audioRef} onEnded={next} preload="metadata" />;
}
