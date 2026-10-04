import { createAgeGateStore } from '@pidro/shared';
import { STORAGE_KEYS } from '@/constants/config';
import { secureStorage } from '@/utils/storage';

export const useAgeGateStore = createAgeGateStore({
  storage: secureStorage,
  storageKey: STORAGE_KEYS.ageGate,
});

export const ageGateStore = useAgeGateStore;
