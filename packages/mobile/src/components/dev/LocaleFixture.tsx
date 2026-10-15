import { useCallback, useState, type ReactNode } from 'react';
import { useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { getLocales } from 'expo-localization';
import { setLocale, syncLocale, type LanguagePreference } from '@pidro/shared';
import { FixtureLanguageContext, installFixtureLocale } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

/** No keyed subtree: changing language must not reset a game or a modal. */
export function LocaleFixture({ children }: { children: ReactNode }) {
  const params = useLocalSearchParams<{
    locale?: string;
    language?: string;
    deviceLocale?: string;
  }>();
  const pathname = usePathname();
  const allowed = __DEV__ && ['/ui-dev', '/table-dev', '/auth-flow-dev'].includes(pathname);
  const initial =
    params.language === 'system' || params.language === 'en' || params.language === 'sv'
      ? params.language
      : useSettingsStore.getState().language;
  const query = JSON.stringify([params.language, params.locale, params.deviceLocale]);
  const [selection, setSelection] = useState<{
    query: string;
    language: LanguagePreference;
  } | null>(null);
  const interactive = selection?.query === query;
  const language = interactive ? selection.language : initial;
  const setLanguage = useCallback(
    (value: LanguagePreference) => {
      setSelection({ query, language: value });
    },
    [query]
  );
  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      return installFixtureLocale(() => {
        if (!interactive && (params.locale === 'en' || params.locale === 'sv')) {
          setLocale(params.locale);
        } else {
          syncLocale(language, () =>
            typeof params.deviceLocale === 'string' && params.deviceLocale
              ? [params.deviceLocale]
              : getLocales().map((locale) => locale.languageTag)
          );
        }
      });
    }, [allowed, language, interactive, params.locale, params.deviceLocale])
  );
  return (
    <FixtureLanguageContext.Provider value={allowed ? { language, setLanguage } : null}>
      {children}
    </FixtureLanguageContext.Provider>
  );
}
