'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserInfo {
  userId?: number;
  userName?: string;
  nickName?: string;
  email?: string;
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
      isLoggedIn: () => {
        const { info } = get();
        return Boolean(info?.userId || info?.userName || info?.email);
      },
    }),
    {
      name: 'mediaminds-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** 供非 React 环境（axios 等）读取 token */
export const getToken = () => useAuthStore.getState().token;
