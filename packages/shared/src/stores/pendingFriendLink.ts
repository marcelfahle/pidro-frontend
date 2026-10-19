import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PersistStorage } from "../platform/types";
import { normalizeFriendSlug } from "../utils/inviteLink";

/** The player whose link brought someone here, held until they have an account. */
export interface PendingFriendLink {
  slug: string;
  displayName: string | null;
  receivedAt: number;
}

export interface PendingFriendLinkState {
  pendingFriendLink: PendingFriendLink | null;
  hydrated: boolean;
  setPendingFriendLink: (slug: string, displayName?: string | null) => void;
  clearPendingFriendLink: () => void;
  setHydrated: (hydrated: boolean) => void;
}

interface CreatePendingFriendLinkStoreOptions {
  storage: PersistStorage;
  storageKey?: string;
}

export function sanitizePendingFriendLink(value: unknown): PendingFriendLink | null {
  if (!value || typeof value !== "object") return null;
  const persisted = value as Partial<Record<keyof PendingFriendLink, unknown>>;
  if (typeof persisted.slug !== "string") return null;

  const slug = normalizeFriendSlug(persisted.slug);
  if (!slug) return null;

  return {
    slug,
    displayName:
      typeof persisted.displayName === "string" && persisted.displayName.trim()
        ? persisted.displayName.trim()
        : null,
    receivedAt:
      typeof persisted.receivedAt === "number" &&
      Number.isFinite(persisted.receivedAt)
        ? persisted.receivedAt
        : Date.now(),
  };
}

export function createPendingFriendLinkStore({
  storage,
  storageKey = "pending-friend-link-storage",
}: CreatePendingFriendLinkStoreOptions) {
  return create<PendingFriendLinkState>()(
    persist(
      (set) => ({
        pendingFriendLink: null,
        hydrated: false,
        setPendingFriendLink: (slug, displayName = null) => {
          const link = sanitizePendingFriendLink({
            slug,
            displayName,
            receivedAt: Date.now(),
          });
          if (link) set({ pendingFriendLink: link });
        },
        clearPendingFriendLink: () => set({ pendingFriendLink: null }),
        setHydrated: (hydrated) => set({ hydrated }),
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({ pendingFriendLink: state.pendingFriendLink }),
        merge: (persisted, current) => ({
          ...current,
          pendingFriendLink: sanitizePendingFriendLink(
            (persisted as { pendingFriendLink?: unknown } | undefined)
              ?.pendingFriendLink,
          ),
        }),
        onRehydrateStorage: (initialState) => () =>
          initialState.setHydrated(true),
      },
    ),
  );
}

export type PendingFriendLinkStore = ReturnType<typeof createPendingFriendLinkStore>;
