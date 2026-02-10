import { createSettingsStore } from '@pidro/shared';
import { webStorage } from '../platform/storage';

export const useSettingsStore = createSettingsStore({
  storage: webStorage,
});
