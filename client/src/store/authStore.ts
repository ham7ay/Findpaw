import { create } from 'zustand';
import type { AuthUser } from '../lib/firebase';

interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  setUser: (u: AuthUser | null) => void;
  setInitialized: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ initialized }),
}));
