import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PersistStorage } from '../platform/types';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  hapticEnabled: boolean;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSound: () => void;
  toggleHaptic: () => void;
}

interface CreateSettingsStoreOptions {
  storage: PersistStorage;
  storageKey?: string;
}

export function createSettingsStore({
  storage,
  storageKey = 'settings-storage',
}: CreateSettingsStoreOptions) {
  return create<SettingsState>()(
    persist(
      (set) => ({
        theme: 'system',
        soundEnabled: true,
        hapticEnabled: true,

        setTheme: (theme) => set({ theme }),
        toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
        toggleHaptic: () => set((state) => ({ hapticEnabled: !state.hapticEnabled })),
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => storage),
      }
    )
  );
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
