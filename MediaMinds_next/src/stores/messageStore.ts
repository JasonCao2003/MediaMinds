'use client';

import { create } from 'zustand';

export interface AppMessage {
  id: string;
  title: string;
  content: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'system' | string;
  read?: boolean;
  time?: number;
  timestamp?: number;
  isSystem?: boolean;
  isPersonal?: boolean;
  isBroadcast?: boolean;
  raw?: Record<string, unknown>;
}

interface MessageState {
  messages: AppMessage[];
  addMessage: (msg: AppMessage) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeMessage: (id: string) => void;
  clear: () => void;
}

const MAX = 100;

export const useMessageStore = create<MessageState>()((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((state) => {
      if (state.messages.some((m) => m.id === msg.id)) return state;
      const next = [msg, ...state.messages];
      return { messages: next.slice(0, MAX) };
    }),
  markRead: (id) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
    })),
  markAllRead: () =>
    set((state) => ({ messages: state.messages.map((m) => ({ ...m, read: true })) })),
  removeMessage: (id) =>
    set((state) => ({ messages: state.messages.filter((m) => m.id !== id) })),
  clear: () => set({ messages: [] }),
}));

/** 非 React 环境写入（WebSocket 回调） */
export const pushMessage = (msg: AppMessage) => useMessageStore.getState().addMessage(msg);
