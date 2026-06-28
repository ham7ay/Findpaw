import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';
type Language = 'en' | 'es' | 'ur' | 'fr';

interface UIState {
  theme: Theme;
  language: Language;
  sidebarCollapsed: boolean;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'findpaw-ui' }
  )
);
