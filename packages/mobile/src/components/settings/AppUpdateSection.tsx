import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { updatesEnabled as enabled } from '@/hooks/useAppUpdate';
import { PidroSpacing } from '@/design/tokens';
import { useTranslation, type TranslationKey } from '@/i18n';

export function AppUpdateSection() {
  const { t } = useTranslation();
  const { isUpdateAvailable, isUpdatePending, isChecking, isDownloading, isRestarting } =
    Updates.useUpdates();
  const [action, setAction] = useState<'check' | 'download' | 'restart' | null>(null);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  // isRestarting also covers a Restart from the shell's update notice.
  const busy = action !== null || isChecking || isDownloading || isRestarting;

  async function handleUpdate() {
    if (!enabled || busy || inFlight.current) return;
    inFlight.current = true;
    const nextAction = isUpdatePending ? 'restart' : isUpdateAvailable ? 'download' : 'check';
    setAction(nextAction);
    setMessage(null);
    setError(false);
    try {
      if (nextAction === 'restart') {
        await Updates.reloadAsync();
        // Expo resolves before the runtime reloads. Keep the control locked.
        return;
      } else if (nextAction === 'download') {
        const result = await Updates.fetchUpdateAsync();
        if (!result.isNew && !result.isRollBackToEmbedded) {
          setError(true);
          setMessage('update.downloadError');
        }
      } else {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable && !result.isRollBackToEmbedded) {
          setMessage('update.latest');
        }
      }
    } catch {
      setError(true);
      setMessage(nextAction === 'restart' ? 'update.restartError' : 'update.serviceError');
    }
    inFlight.current = false;
    setAction(null);
  }

  const status = !enabled
    ? 'update.disabled'
    : action === 'restart' || isRestarting
      ? 'update.restarting'
      : isDownloading || action === 'download'
        ? 'update.downloading'
        : isChecking || action === 'check'
          ? 'update.checking'
          : error
            ? message
            : isUpdatePending
              ? 'update.pending'
              : isUpdateAvailable
                ? 'update.available'
                : (message ?? 'update.prompt');

  return (
    <Surface variant="window" padded style={styles.panel} testID="app-update-section">
      <PidroText role="label">{t('update.title')}</PidroText>
      <Surface variant="subtle" style={styles.details}>
        <View style={styles.versionRow}>
          <PidroText role="metadata" tone="muted">
            {t('update.version')}
          </PidroText>
          <PidroText role="metadata" selectable>
            {Application.nativeApplicationVersion ?? t('update.unavailable')}
          </PidroText>
        </View>
        <View style={styles.versionRow}>
          <PidroText role="metadata" tone="muted">
            {t('update.build')}
          </PidroText>
          <PidroText role="metadata" selectable>
            {Application.nativeBuildVersion ?? t('update.unavailable')}
          </PidroText>
        </View>
        <View style={styles.versionRow}>
          <PidroText role="metadata" tone="muted">
            {t('update.channel')}
          </PidroText>
          <PidroText role="metadata" selectable>
            {Updates.channel || t('update.unavailable')}
          </PidroText>
        </View>
        <PidroText role="metadata" tone="muted">
          {t('update.running')}
        </PidroText>
        <PidroText role="metadata" selectable>
          {enabled
            ? Updates.isEmbeddedLaunch
              ? t('update.embedded')
              : (Updates.updateId ?? t('update.unavailable'))
            : t('update.development')}
        </PidroText>
      </Surface>
      <PidroText role="metadata" tone={error ? 'danger' : 'muted'} accessibilityLiveRegion="polite">
        {status ? t(status) : null}
      </PidroText>
      {enabled && (
        <BevelButton
          label={
            isUpdatePending
              ? t('update.apply')
              : isUpdateAvailable
                ? t('update.download')
                : t('update.check')
          }
          material={isUpdatePending || isUpdateAvailable ? 'wood' : 'glass'}
          fullWidth
          loading={busy}
          onPress={handleUpdate}
        />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  panel: { gap: PidroSpacing.sm },
  details: { padding: PidroSpacing.sm, gap: PidroSpacing.xs },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: PidroSpacing.xs,
  },
});
