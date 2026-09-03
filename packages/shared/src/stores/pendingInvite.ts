import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PersistStorage } from "../platform/types";
import type { InviteSource } from "../utils/inviteLink";
import { isInviteSource, normalizeInviteCode } from "../utils/inviteLink";

export interface PendingInvite {
  code: string;
  source?: InviteSource;
  receivedAt: number;
}

export interface PendingInviteState {
  pendingInvite: PendingInvite | null;
  hydrated: boolean;
  setPendingInvite: (code: string, source?: InviteSource) => void;
  clearPendingInvite: () => void;
  setHydrated: (hydrated: boolean) => void;
}

interface CreatePendingInviteStoreOptions {
  storage: PersistStorage;
  storageKey?: string;
}

function sanitizePendingInvite(value: unknown): PendingInvite | null {
  if (!value || typeof value !== "object") return null;
  const persisted = value as Partial<Record<keyof PendingInvite, unknown>>;
  if (typeof persisted.code !== "string") return null;

  const code = normalizeInviteCode(persisted.code);
  if (!code) return null;

  return {
    code,
    ...(typeof persisted.source === "string" && isInviteSource(persisted.source)
      ? { source: persisted.source }
      : {}),
    receivedAt:
      typeof persisted.receivedAt === "number" &&
      Number.isFinite(persisted.receivedAt)
        ? persisted.receivedAt
        : Date.now(),
  };
}

export function createPendingInviteStore({
  storage,
  storageKey = "pending-invite-storage",
}: CreatePendingInviteStoreOptions) {
  const store = create<PendingInviteState>()(
    persist(
      (set) => ({
        pendingInvite: null,
        hydrated: false,
        setPendingInvite: (code, source) => {
          const normalized = normalizeInviteCode(code);
          if (!normalized) return;
          set({
            pendingInvite: { code: normalized, source, receivedAt: Date.now() },
          });
        },
        clearPendingInvite: () => set({ pendingInvite: null }),
        setHydrated: (hydrated) => set({ hydrated }),
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({ pendingInvite: state.pendingInvite }),
        merge: (persisted, current) => ({
          ...current,
          pendingInvite: sanitizePendingInvite(
            (persisted as { pendingInvite?: unknown } | undefined)
              ?.pendingInvite,
          ),
        }),
        onRehydrateStorage: () => (state) => state?.setHydrated(true),
      },
    ),
  );

  return store;
}

export type PendingInviteStore = ReturnType<typeof createPendingInviteStore>;
