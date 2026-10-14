import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PersistStorage } from '../platform/types';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  hapticEnabled: boolean;
  /** The pin each player on this device chose to wear. Unset wears the default. */
  pins: Record<string, PinChoice>;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSound: () => void;
  toggleHaptic: () => void;
  setPin: (userId: string, pin: PinChoice) => void;
}

export type PinChoice = 'classic' | 'none';

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
        pins: {},

        setTheme: (theme) => set({ theme }),
        toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
        toggleHaptic: () => set((state) => ({ hapticEnabled: !state.hapticEnabled })),
        setPin: (userId, pin) => set((state) => ({ pins: { ...state.pins, [userId]: pin } })),
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => storage),
      }
    )
  );
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
