'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserInfo {
  userId?: number;
  userName?: string;
  nickName?: string;
  email?: string;
  role?: 'user' | 'admin' | string;
  birthday?: string;
  sex?: string;
  avatar?: string;
  introduction?: string;
}

interface AuthState {
  token: string;
  info: UserInfo;
  setToken: (token: string) => void;
  removeToken: () => void;
  setInfo: (info: UserInfo) => void;
  removeInfo: () => void;
  logout: () => void;
  isAdmin: () => boolean;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: '',
      info: {},
      setToken: (token) => set({ token }),
      removeToken: () => set({ token: '' }),
      setInfo: (info) => set({ info }),
      removeInfo: () => set({ info: {} }),
      logout: () => set({ token: '', info: {} }),
      isAdmin: () => get().info?.role === 'admin',
      isLoggedIn: () => {
        const { info } = get();
        return Boolean(info?.userId || (info?.userName && info?.role) || (info?.email && info?.role));
      },
    }),
    {
      name: 'mediaminds-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** 供非 React 环境（axios / websocket）读取 token */
export const getToken = () => useAuthStore.getState().token;
