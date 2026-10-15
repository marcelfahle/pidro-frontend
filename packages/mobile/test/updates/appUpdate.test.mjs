import { describe, expect, it } from 'bun:test';
import {
  shouldCheckOnForeground,
  shouldShowUpdateNotice,
  UPDATE_CHECK_INTERVAL_MS,
} from '../../src/features/appUpdate.ts';

const ready = {
  enabled: true,
  isUpdatePending: true,
  downloadedUpdateId: 'update-2',
  dismissedUpdateId: null,
  inGame: false,
};

describe('update notice', () => {
  it('shows once an update has downloaded', () => {
    expect(shouldShowUpdateNotice(ready)).toBe(true);
  });

  it('stays away until the update has downloaded', () => {
    expect(shouldShowUpdateNotice({ ...ready, isUpdatePending: false })).toBe(false);
  });

  it('never shows in a build without OTA updates', () => {
    expect(shouldShowUpdateNotice({ ...ready, enabled: false })).toBe(false);
  });

  it('never shows at the table', () => {
    expect(shouldShowUpdateNotice({ ...ready, inGame: true })).toBe(false);
  });

  it('stays dismissed for that update, and returns for a newer one', () => {
    const dismissed = { ...ready, dismissedUpdateId: 'update-2' };
    expect(shouldShowUpdateNotice(dismissed)).toBe(false);
    expect(shouldShowUpdateNotice({ ...dismissed, downloadedUpdateId: 'update-3' })).toBe(true);
  });

  it('can be dismissed when Expo does not say which update is pending', () => {
    const unnamed = { ...ready, downloadedUpdateId: undefined };
    expect(shouldShowUpdateNotice(unnamed)).toBe(true);
    expect(shouldShowUpdateNotice({ ...unnamed, dismissedUpdateId: 'pending' })).toBe(false);
  });
});

describe('foreground update check', () => {
  const now = 1_000_000_000;
  const quiet = { enabled: true, busy: false, now };

  it('checks when nothing has checked yet', () => {
    expect(shouldCheckOnForeground({ ...quiet, lastCheckedAt: null })).toBe(true);
  });

  it('waits fifteen minutes between checks', () => {
    const justUnder = now - UPDATE_CHECK_INTERVAL_MS + 1;
    expect(UPDATE_CHECK_INTERVAL_MS).toBe(15 * 60 * 1000);
    expect(shouldCheckOnForeground({ ...quiet, lastCheckedAt: justUnder })).toBe(false);
    expect(
      shouldCheckOnForeground({ ...quiet, lastCheckedAt: now - UPDATE_CHECK_INTERVAL_MS })
    ).toBe(true);
  });

  it('does not check while a check or download is running, or without OTA', () => {
    expect(shouldCheckOnForeground({ ...quiet, busy: true, lastCheckedAt: null })).toBe(false);
    expect(shouldCheckOnForeground({ ...quiet, enabled: false, lastCheckedAt: null })).toBe(false);
  });
});
