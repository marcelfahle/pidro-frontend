import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PersistStorage } from '../platform/types';
import type { RuleSet } from '../types/lobby';
import type { LanguagePreference } from '../i18n';

interface SettingsState {
  language: LanguagePreference;
  hydrated: boolean;
  setLanguage: (language: LanguagePreference) => void;
  setHydrated: (hydrated: boolean) => void;
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  hapticEnabled: boolean;
  /** The pin each player on this device chose to wear. Unset wears the default. */
  pins: Record<string, PinChoice>;
  preferredRuleSet: RuleSet;
  lobbyRuleSetFilter: RuleSet | 'all' | null;
  hasSeenLouisianaRules: boolean;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSound: () => void;
  toggleHaptic: () => void;
  setPin: (userId: string, pin: PinChoice) => void;
  setPreferredRuleSet: (preferredRuleSet: RuleSet) => void;
  setLobbyRuleSetFilter: (lobbyRuleSetFilter: RuleSet | 'all') => void;
  markLouisianaRulesSeen: () => void;
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
        language: 'system',
        hydrated: false,
        setLanguage: (language) => set({ language }),
        setHydrated: (hydrated) => set({ hydrated }),
        theme: 'system',
        soundEnabled: true,
        hapticEnabled: true,
        pins: {},
        preferredRuleSet: 'finnish',
        lobbyRuleSetFilter: null,
        hasSeenLouisianaRules: false,

        setTheme: (theme) => set({ theme }),
        toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
        toggleHaptic: () => set((state) => ({ hapticEnabled: !state.hapticEnabled })),
        setPin: (userId, pin) => set((state) => ({ pins: { ...state.pins, [userId]: pin } })),
        setPreferredRuleSet: (preferredRuleSet) => set({ preferredRuleSet }),
        setLobbyRuleSetFilter: (lobbyRuleSetFilter) => set({ lobbyRuleSetFilter }),
        markLouisianaRulesSeen: () => set({ hasSeenLouisianaRules: true }),
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => storage),
        partialize: ({ hydrated, ...state }) => state,
        // Default merge migrates old version-0 stores without losing their preferences.
        merge: (persisted, current) => {
          const saved = persisted as Partial<SettingsState> | undefined;
          const language = saved?.language;
          return {
            ...current,
            ...saved,
            hydrated: false,
            language: language === 'en' || language === 'sv' ? language : 'system',
          };
        },
        onRehydrateStorage: (initial) => (_state, error) => {
          // A synchronous read/JSON failure can occur before Zustand finishes
          // assigning initial state. Defer that fallback so it is not overwritten.
          if (error) queueMicrotask(() => initial.setHydrated(true));
          else initial.setHydrated(true);
        },
      }
    )
  );
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
