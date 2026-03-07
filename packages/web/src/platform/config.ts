import type { PlatformConfig } from '@pidro/shared';

const hasWindow = typeof window !== 'undefined';
const defaultWsProtocol = hasWindow && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const defaultWsHost = hasWindow ? window.location.host : 'localhost:5173';

export const API_CONFIG: PlatformConfig = {
  baseURL: import.meta.env.VITE_API_URL || '',
  wsURL: import.meta.env.VITE_WS_URL || `${defaultWsProtocol}//${defaultWsHost}/socket`,
  timeout: 10_000,
};
