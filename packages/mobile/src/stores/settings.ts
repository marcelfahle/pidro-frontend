import { createSettingsStore } from '@pidro/shared';
import { secureStorage } from '@/utils/storage';

export const useSettingsStore = createSettingsStore({
  storage: secureStorage,
});
