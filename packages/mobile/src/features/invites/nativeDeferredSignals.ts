import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { getCalendars, getLocales } from 'expo-localization';
import { Dimensions, Platform } from 'react-native';
import type { DeferredInviteFingerprint } from '@pidro/shared';
import { screenClassFor } from './deferredInstall';

export async function readInstallationTime(): Promise<Date | null> {
  try {
    return await Application.getInstallationTimeAsync();
  } catch {
    return null;
  }
}

export async function readPlayInstallReferrer(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    return await Application.getInstallReferrerAsync();
  } catch {
    return null;
  }
}

export async function readDeferredFingerprint(): Promise<DeferredInviteFingerprint | null> {
  const osMajor = Device.osVersion?.match(/^\d+/)?.[0];
  const locale = getLocales()[0]?.languageTag;
  const timezone = getCalendars()[0]?.timeZone;
  const { width, height } = Dimensions.get('window');

  if (!osMajor || !locale || !timezone || width <= 0 || height <= 0) return null;
  return {
    os_major: osMajor,
    screen_class: screenClassFor(width, height),
    locale,
    timezone,
  };
}
