import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PersistStorage } from '../platform/types';
import type { User } from '../api/auth';

export type { User };

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  status: AuthStatus;
  hydrated: boolean;

  setSession: (data: { accessToken: string; refreshToken?: string; user: User }) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
};

const initialState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  status: 'checking' as AuthStatus,
  hydrated: false,
};

interface CreateAuthStoreOptions {
  storage: PersistStorage;
  storageKey?: string;
}

export function createAuthStore({ storage, storageKey = 'auth-storage' }: CreateAuthStoreOptions) {
  const store = create<AuthState>()(
    persist(
      (set, get) => ({
        ...initialState,

        setSession: ({ accessToken, refreshToken, user }) => {
          set({
            accessToken,
            refreshToken: refreshToken ?? get().refreshToken,
            user,
            status: 'authenticated',
          });
        },

        clearSession: () => {
          set({
            accessToken: null,
            refreshToken: null,
            user: null,
            status: 'unauthenticated',
          });

          storage.removeItem?.(storageKey);
        },

        setHydrated: (hydrated) => set({ hydrated }),
      }),
      {
        name: storageKey,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          user: state.user,
        }),
        onRehydrateStorage: () => (state) => {
          const isValidSession = (s: typeof state): s is typeof state & { user: User } => {
            return (
              typeof s?.accessToken === 'string' &&
              s.accessToken.length > 0 &&
              !!s.user &&
              typeof s.user.id === 'string' &&
              s.user.id.length > 0 &&
              typeof s.user.username === 'string' &&
              s.user.username.length > 0
            );
          };

          if (!state) {
            store.setState({
              ...initialState,
              status: 'unauthenticated',
              hydrated: true,
            });
            return;
          }

          if (isValidSession(state)) {
            state.status = 'authenticated';
          } else {
            state.accessToken = null;
            state.refreshToken = null;
            state.user = null;
            state.status = 'unauthenticated';
          }

          state.hydrated = true;
        },
      }
    )
  );

  return store;
}

export type AuthStore = ReturnType<typeof createAuthStore>;
