import { create } from 'zustand';
import { apiFetch } from '../lib/api.js';

export interface UserState {
  id: string;
  username: string;
  displayName: string;
  hasSafetyPin: boolean;
  hasDuressPin: boolean;
  falseAlarmCount?: number;
  settings?: any;
}

interface AuthStore {
  user: UserState | null;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  setUser: (user: UserState | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,

  checkSession: async () => {
    try {
      const data = await apiFetch<{ user: UserState }>('/api/me');
      set({ user: data.user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    set({ user: null });
  },
}));
