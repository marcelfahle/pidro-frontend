import { Platform } from 'react-native';

/**
 * Application configuration constants
 */

const LOCALHOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

export const API_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || `http://${LOCALHOST}:4003`,
  wsURL: process.env.EXPO_PUBLIC_WS_URL || `ws://${LOCALHOST}:4003/socket`,
  timeout: 10_000,
} as const;

export const STORAGE_KEYS = {
  auth: 'auth-storage',
} as const;

export const APP_CONFIG = {
  name: 'Pidro',
  version: '1.0.0',
} as const;
