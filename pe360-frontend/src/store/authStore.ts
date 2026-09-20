import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  sessionKey: number;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionKey: 0,
      setAuth: (user, token) =>
        // Increment sessionKey on every login — forces full remount of all
        // route components so no previous user's in-memory state leaks.
        set((state) => ({
          user,
          token,
          isAuthenticated: true,
          sessionKey: state.sessionKey + 1,
        })),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'pe360-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // sessionKey intentionally NOT persisted — always starts fresh on
        // page reload, meaning every page load forces a clean remount.
      }),
    }
  )
);
