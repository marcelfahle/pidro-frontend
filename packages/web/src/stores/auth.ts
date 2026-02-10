import { createAuthStore } from '@pidro/shared';
import { webStorage } from '../platform/storage';

export type { AuthState, AuthStatus, User } from '@pidro/shared';

export const useAuthStore = createAuthStore({
  storage: webStorage,
  storageKey: 'auth-storage',
});

export const authStore = useAuthStore;
