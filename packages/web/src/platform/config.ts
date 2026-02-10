import type { PlatformConfig } from '@pidro/shared';

export const API_CONFIG: PlatformConfig = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4003',
  wsURL: import.meta.env.VITE_WS_URL || 'ws://localhost:4003/socket',
  timeout: 10_000,
};
