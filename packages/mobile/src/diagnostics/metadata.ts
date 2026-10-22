import { nativeApplicationVersion, nativeBuildVersion } from 'expo-application';
import { Platform } from 'react-native';
import { APP_CONFIG } from '@/constants/config';

const version = nativeApplicationVersion ?? APP_CONFIG.version;
const build = nativeBuildVersion ?? '0'; // Web/development has no native build number.
export const diagnosticMetadata = {
  app_version: /^[0-9][0-9.\-]{0,31}$/.test(version) ? version : APP_CONFIG.version,
  build: /^[0-9]{1,20}$/.test(build) ? build : '0',
  platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
} as const;
