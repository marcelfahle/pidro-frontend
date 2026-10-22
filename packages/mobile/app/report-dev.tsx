import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { installFixtureLocale, setLocale, useTranslation } from '@/i18n';
import { ReportSendError, type CapturedGameReport } from '@/diagnostics/report';
import { GameProblemReport, type GameReportActions } from '@/game/canvas/GameProblemReport';

const fixtureReport: CapturedGameReport = {
  owner: 'fixture',
  room_code: 'DEMO',
  game_instance_id: 'fixture-only',
  app_version: '3.2.0',
  build: '0',
  platform: 'web',
  events: [{ type: 'tap', code: 'pending', action: 'play_card', offset_ms: 0 }],
};

export default function ReportDevRoute() {
  if (!__DEV__) return <Redirect href="/home" />;
  return <ReportFixture />;
}

function ReportFixture() {
  const {
    mode = 'success',
    kind = 'offline',
    locale = 'en',
  } = useLocalSearchParams<{
    mode?: string;
    kind?: string;
    locale?: string;
  }>();
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  useFocusEffect(
    useCallback(
      () => installFixtureLocale(() => setLocale(locale === 'sv' ? 'sv' : 'en')),
      [locale]
    )
  );
  const actions = useMemo<GameReportActions>(
    () => ({
      capture: () => (mode === 'unsupported' ? null : fixtureReport),
      send: async () => {
        // Deliberate, deterministic delay: loading settles successfully after 15 seconds.
        await new Promise((resolve) => setTimeout(resolve, mode === 'loading' ? 15000 : 600));
        if (mode === 'failure') {
          const kinds: ReportSendError['kind'][] = [
            'unsupported',
            'offline',
            'forbidden',
            'rate_limited',
            'unavailable',
            'failed',
            'identity_changed',
          ];
          throw new ReportSendError(
            kinds.find((candidate) => candidate === kind) ?? 'failed',
            kind === 'rate_limited' ? 5 : null
          );
        }
        return '7f25afc0-08dc-4f4a-95a0-7f7ffdb0b128';
      },
    }),
    [mode, kind]
  );
  return (
    <SafeAreaProvider>
      <View style={styles.screen}>
        {!open && <BevelButton label={t('game.report_title')} onPress={() => setOpen(true)} />}
        <GameProblemReport open={open} onClose={() => setOpen(false)} actions={actions} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.feltBottom,
    padding: PidroSpacing.lg,
  },
});
