import type { StateStorage } from 'zustand/middleware';

export type PersistStorage = StateStorage;

export interface PlatformConfig {
  baseURL: string;
  wsURL: string;
  timeout: number;
}
