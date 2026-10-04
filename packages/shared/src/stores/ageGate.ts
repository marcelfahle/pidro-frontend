import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DeclaredAgeBand } from "../api/auth";
import type { PersistStorage } from "../platform/types";

export type AgeGateState = {
  ageBand: DeclaredAgeBand | null;
  termsVersion: string | null;
  hydrated: boolean;
  setAnswer: (ageBand: DeclaredAgeBand, termsVersion: string) => void;
  setHydrated: (hydrated: boolean) => void;
};

interface CreateAgeGateStoreOptions {
  storage: PersistStorage;
  storageKey?: string;
}

export function createAgeGateStore({
  storage,
  storageKey = "age-gate-storage",
}: CreateAgeGateStoreOptions) {
  return create<AgeGateState>()(
    persist(
      (set) => ({
        ageBand: null,
        termsVersion: null,
        hydrated: false,
        setAnswer: (ageBand, termsVersion) => set({ ageBand, termsVersion }),
        setHydrated: (hydrated) => set({ hydrated }),
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => storage),
        partialize: ({ ageBand, termsVersion }) => ({ ageBand, termsVersion }),
        onRehydrateStorage: (initialState) => () =>
          initialState.setHydrated(true),
      },
    ),
  );
}

export type AgeGateStore = ReturnType<typeof createAgeGateStore>;
