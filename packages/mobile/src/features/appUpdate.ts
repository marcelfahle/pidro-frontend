/**
 * When the "new version is ready" notice shows, and when coming back to the
 * app is worth a quiet update check. Expo downloads updates in the background;
 * these decide only what the player sees and how often we ask.
 */

/** Coming back to the app checks at most this often. */
export const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export interface UpdateNoticeInput {
  /** OTA updates work in this build: a release build, not web or dev. */
  enabled: boolean;
  isUpdatePending: boolean;
  downloadedUpdateId: string | null | undefined;
  /** The update the player dismissed this session, if any. */
  dismissedUpdateId: string | null;
  /** Seated at a table. A restart there would cost a hand. */
  inGame: boolean;
}

/** The update the notice is about, or null when there is nothing to offer. */
export function pendingUpdateId({
  enabled,
  isUpdatePending,
  downloadedUpdateId,
}: Pick<UpdateNoticeInput, 'enabled' | 'isUpdatePending' | 'downloadedUpdateId'>) {
  if (!enabled || !isUpdatePending) return null;
  return downloadedUpdateId ?? 'pending';
}

export function shouldShowUpdateNotice(input: UpdateNoticeInput) {
  const id = pendingUpdateId(input);
  return id !== null && id !== input.dismissedUpdateId && !input.inGame;
}

export function shouldCheckOnForeground({
  enabled,
  busy,
  now,
  lastCheckedAt,
}: {
  enabled: boolean;
  /** A check or download is already running. */
  busy: boolean;
  now: number;
  lastCheckedAt: number | null | undefined;
}) {
  if (!enabled || busy) return false;
  return lastCheckedAt == null || now - lastCheckedAt >= UPDATE_CHECK_INTERVAL_MS;
}
