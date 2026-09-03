import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { STORAGE_KEYS } from '@/constants/config';

const INSTALL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getInstallId(): Promise<string> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.installId);
  if (stored && INSTALL_ID_PATTERN.test(stored)) return stored;

  const installId = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_KEYS.installId, installId);
  return installId;
}
