import { createPendingInviteStore } from '@pidro/shared';
import { STORAGE_KEYS } from '@/constants/config';
import { secureStorage } from '@/utils/storage';

export const usePendingInviteStore = createPendingInviteStore({
  storage: secureStorage,
  storageKey: STORAGE_KEYS.pendingInvite,
});

export const pendingInviteStore = usePendingInviteStore;
