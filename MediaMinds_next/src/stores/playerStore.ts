'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Track {
  id: string | number;
  name: string;
  url?: string;
  pic?: string;
  singerId?: string | number;
  singerName?: string;
  lyrics?: string;
  /** 酷狗直链所需的 hash / albumAudioId */
  hash?: string;
  albumAudioId?: string;
  albumId?: string;
  source?: 'local' | 'kugou';
}

interface PlayerState {
  playlist: Track[];
  currentIndex: number;
  playing: boolean;
  current: Track | null;
  play: (track: Track) => void;
  addToPlaylist: (track: Track) => void;
  playList: (tracks: Track[], startIndex?: number) => void;
  removeFromPlaylist: (index: number) => void;
  clear: () => void;
  setIndex: (index: number) => void;
  setPlaying: (playing: boolean) => void;
  next: () => void;
  prev: () => void;
  /** 更新当前曲目的字段（如补齐封面 / 歌词） */
  updateCurrent: (patch: Partial<Track>) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      playlist: [],
      currentIndex: -1,
      playing: false,
      current: null,
      play: (track) => {
        const { playlist } = get();
        const idx = playlist.findIndex((t) => String(t.id) === String(track.id));
        if (idx >= 0) {
          set({ currentIndex: idx, current: playlist[idx], playing: true });
        } else {
          const next = [...playlist, track];
          set({ playlist: next, currentIndex: next.length - 1, current: track, playing: true });
        }
      },
      addToPlaylist: (track) =>
        set((state) => {
          if (state.playlist.some((t) => String(t.id) === String(track.id))) return state;
          return { playlist: [...state.playlist, track] };
        }),
      playList: (tracks, startIndex = 0) =>
        set({
          playlist: tracks,
          currentIndex: tracks.length ? startIndex : -1,
          current: tracks[startIndex] ?? null,
          playing: tracks.length > 0,
        }),
      removeFromPlaylist: (index) =>
        set((state) => {
          const playlist = state.playlist.filter((_, i) => i !== index);
          const currentIndex =
            index < state.currentIndex
              ? state.currentIndex - 1
              : index === state.currentIndex
                ? Math.min(index, playlist.length - 1)
                : state.currentIndex;
          return {
            playlist,
            currentIndex,
            current: playlist[currentIndex] ?? null,
            playing: playlist.length > 0 ? state.playing : false,
          };
        }),
      clear: () => set({ playlist: [], currentIndex: -1, current: null, playing: false }),
      setIndex: (index) =>
        set((state) => ({ currentIndex: index, current: state.playlist[index] ?? null })),
      setPlaying: (playing) => set({ playing }),
      next: () =>
        set((state) => {
          if (!state.playlist.length) return state;
          const index = (state.currentIndex + 1) % state.playlist.length;
          return { currentIndex: index, current: state.playlist[index], playing: true };
        }),
      prev: () =>
        set((state) => {
          if (!state.playlist.length) return state;
          const index = (state.currentIndex - 1 + state.playlist.length) % state.playlist.length;
          return { currentIndex: index, current: state.playlist[index], playing: true };
        }),
      updateCurrent: (patch) =>
        set((state) => {
          if (!state.current) return state;
          const updated = { ...state.current, ...patch };
          const playlist = state.playlist.map((track, index) =>
            index === state.currentIndex ? updated : track,
          );
          return { current: updated, playlist };
        }),
    }),
    {
      name: 'global_music_playlist',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        playlist: state.playlist,
        currentIndex: state.currentIndex,
      }) as unknown as PlayerState,
    },
  ),
);
