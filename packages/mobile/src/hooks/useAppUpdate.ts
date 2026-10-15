import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import {
  pendingUpdateId,
  shouldCheckOnForeground,
  shouldShowUpdateNotice,
} from '@/features/appUpdate';

/** OTA updates run only in installed release builds, not Expo Go or web previews. */
export const updatesEnabled = Platform.OS !== 'web' && !__DEV__ && Updates.isEnabled;

// A dismissal lasts for this app session, across shell remounts (sign out, sign in).
let sessionDismissedUpdateId: string | null = null;

/**
 * The shell's update notice: whether it shows, and Restart / dismiss. Also
 * checks quietly when the app comes back to the foreground. Mount once.
 * `forced` is the dev fixture: the notice shows and Restart only goes busy.
 */
export function useAppUpdate({ inGame, forced = false }: { inGame: boolean; forced?: boolean }) {
  const {
    isUpdatePending,
    downloadedUpdate,
    isChecking,
    isDownloading,
    isRestarting,
    lastCheckForUpdateTimeSinceRestart,
  } = Updates.useUpdates();
  const [dismissedUpdateId, setDismissedUpdateId] = useState(sessionDismissedUpdateId);
  const [restarting, setRestarting] = useState(false);
  const inFlight = useRef(false);

  const pending = {
    enabled: updatesEnabled,
    isUpdatePending,
    downloadedUpdateId: downloadedUpdate?.updateId,
  };
  const updateId = forced ? 'fixture' : pendingUpdateId(pending);
  const visible = forced
    ? dismissedUpdateId !== updateId
    : shouldShowUpdateNotice({ ...pending, dismissedUpdateId, inGame });

  const busy = isChecking || isDownloading;
  const lastCheckedAt = lastCheckForUpdateTimeSinceRestart?.getTime();

  useEffect(() => {
    if (!updatesEnabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (!shouldCheckOnForeground({ enabled: true, busy, now: Date.now(), lastCheckedAt })) return;
      // Quiet: a failed check waits for the next foreground; the notice is the only UI.
      Updates.checkForUpdateAsync()
        .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : null))
        .catch(() => {});
    });
    return () => subscription.remove();
  }, [busy, lastCheckedAt]);

  const restart = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRestarting(true);
    if (forced) return;
    try {
      await Updates.reloadAsync();
      // Expo resolves before the runtime reloads. Keep the control locked.
    } catch {
      inFlight.current = false;
      setRestarting(false);
    }
  }, [forced]);

  const dismiss = useCallback(() => {
    sessionDismissedUpdateId = updateId;
    setDismissedUpdateId(updateId);
  }, [updateId]);

  return { visible, restarting: restarting || isRestarting, restart, dismiss };
}
