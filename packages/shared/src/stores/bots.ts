import { create } from 'zustand';
import type { BotProfile } from '../types/lobby';

/** Public presentation cache only; never gameplay/strategy state. */
export const useBotCatalogueStore = create<{
  profiles: BotProfile[];
  setProfiles: (profiles: BotProfile[]) => void;
}>((set) => ({ profiles: [], setProfiles: (profiles) => set({ profiles }) }));
