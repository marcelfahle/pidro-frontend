import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';

export function AppUpdateSection() {
  const { isUpdateAvailable, isUpdatePending, isChecking, isDownloading } = Updates.useUpdates();
  const [action, setAction] = useState<'check' | 'download' | 'restart' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  const enabled = Platform.OS !== 'web' && !__DEV__ && Updates.isEnabled;
  const busy = action !== null || isChecking || isDownloading;

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
      } else if (nextAction === 'download') {
        const result = await Updates.fetchUpdateAsync();
        if (!result.isNew && !result.isRollBackToEmbedded) {
          setError(true);
          setMessage('No update was downloaded. Please try again.');
        }
      } else {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable && !result.isRollBackToEmbedded) {
          setMessage('You have the latest update for this build.');
        }
      }
    } catch {
      setError(true);
      setMessage(
        nextAction === 'restart'
          ? 'Could not restart. Close and reopen the app to apply the downloaded update.'
          : 'Could not reach the update service. Check your connection and try again.'
      );
    } finally {
      inFlight.current = false;
      setAction(null);
    }
  }

  const status = !enabled
    ? 'OTA updates are available in installed release builds, not Expo Go or web previews.'
    : action === 'restart'
      ? 'Restarting…'
      : isDownloading || action === 'download'
        ? 'Downloading update…'
        : isChecking || action === 'check'
          ? 'Checking for updates…'
          : error
            ? message
            : isUpdatePending
              ? 'Update ready. Restart when you’re finished playing to apply it.'
              : isUpdateAvailable
                ? 'A new update is available to download.'
                : (message ?? 'Check for the latest update for this build.');

  return (
    <Surface variant="window" padded style={styles.panel} testID="app-update-section">
      <PidroText role="label">About the app</PidroText>
      <Surface variant="subtle" style={styles.details}>
        <View style={styles.versionRow}>
          <PidroText role="metadata" tone="muted">
            Version
          </PidroText>
          <PidroText role="metadata" selectable>
            {Application.nativeApplicationVersion ?? 'Not available'}
          </PidroText>
        </View>
        <View style={styles.versionRow}>
          <PidroText role="metadata" tone="muted">
            Build
          </PidroText>
          <PidroText role="metadata" selectable>
            {Application.nativeBuildVersion ?? 'Not available'}
          </PidroText>
        </View>
        <View style={styles.versionRow}>
          <PidroText role="metadata" tone="muted">
            Channel
          </PidroText>
          <PidroText role="metadata" selectable>
            {Updates.channel || 'Not available'}
          </PidroText>
        </View>
        <PidroText role="metadata" tone="muted">
          Running update
        </PidroText>
        <PidroText role="metadata" selectable>
          {enabled
            ? Updates.isEmbeddedLaunch
              ? 'Included with this build'
              : (Updates.updateId ?? 'Not available')
            : 'Development / preview'}
        </PidroText>
      </Surface>
      <PidroText role="metadata" tone={error ? 'danger' : 'muted'} accessibilityLiveRegion="polite">
        {status}
      </PidroText>
      {enabled && (
        <BevelButton
          label={
            isUpdatePending
              ? 'Restart to apply'
              : isUpdateAvailable
                ? 'Download update'
                : 'Check for updates'
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
