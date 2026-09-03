import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import english from './en.json';

const i18n = new I18n({ en: english });
i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = getLocales()[0]?.languageCode ?? 'en';
// Invite keys stay flat so the first locale remains easy to scan and extend.
i18n.defaultSeparator = '::';

export function t(key: string, values: Record<string, string | number> = {}): string {
  return i18n.t(key, values);
}
