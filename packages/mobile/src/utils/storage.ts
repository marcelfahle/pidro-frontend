import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { StateStorage } from 'zustand/middleware';

const webStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      const storage = globalThis.localStorage;
      return typeof storage?.getItem === 'function' ? storage.getItem(name) : null;
    } catch (e) {
      console.error('[Storage] localStorage.getItem failed', e);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      const storage = globalThis.localStorage;
      if (typeof storage?.setItem === 'function') storage.setItem(name, value);
    } catch (e) {
      console.error('[Storage] localStorage.setItem failed', e);
    }
  },
  removeItem: (name: string): void => {
    try {
      const storage = globalThis.localStorage;
      if (typeof storage?.removeItem === 'function') storage.removeItem(name);
    } catch (e) {
      console.error('[Storage] localStorage.removeItem failed', e);
    }
  },
};

const nativeSecureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch (e) {
      console.error('[Storage] SecureStore.getItemAsync failed', e);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (e) {
      console.error('[Storage] SecureStore.setItemAsync failed', e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (e) {
      console.error('[Storage] SecureStore.deleteItemAsync failed', e);
    }
  },
};

export const secureStorage: StateStorage = Platform.OS === 'web' ? webStorage : nativeSecureStorage;
