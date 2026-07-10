import { createAuthStore } from '@pidro/shared';
import { secureStorage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants/config';

export type { User, AuthState, AuthStatus } from '@pidro/shared';

export const useAuthStore = createAuthStore({
  storage: secureStorage,
  storageKey: STORAGE_KEYS.auth,
});

export const authStore = useAuthStore;
