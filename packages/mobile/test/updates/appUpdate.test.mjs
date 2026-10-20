import { describe, expect, it } from 'bun:test';
import {
  channelLabel,
  runningUpdate,
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

describe('what Settings says is running', () => {
  const update = { enabled: true, isEmbeddedLaunch: false, updateId: '0199f3a2-7c41-7d2e' };

  it('names a beta update and keeps the sha and id for support', () => {
    expect(
      runningUpdate({ ...update, name: 'Vaasa-Boudreaux', sha: '5cca7d0', date: '2026-10-20' })
    ).toEqual({ label: 'Vaasa-Boudreaux · Oct 20', detail: '5cca7d0\n0199f3a2-7c41-7d2e' });
    // The publish day is a calendar date: no time zone moves it to the 19th.
    expect(runningUpdate({ ...update, name: 'Vaasa-Boudreaux', date: '2026-01-01' }).label).toBe(
      'Vaasa-Boudreaux · Jan 1'
    );
    expect(runningUpdate({ ...update, name: 'Vaasa-Boudreaux', date: 'soon' }).label).toBe(
      'Vaasa-Boudreaux'
    );
  });

  it('falls back to the short update id for an update published without a name', () => {
    expect(runningUpdate(update)).toEqual({ label: '0199f3a2', detail: '0199f3a2-7c41-7d2e' });
  });

  it('says plainly when nothing was downloaded', () => {
    expect(runningUpdate({ ...update, isEmbeddedLaunch: true, name: 'Vaasa-Boudreaux' })).toEqual({
      label: 'The version built into the app',
      detail: null,
    });
    expect(runningUpdate({ ...update, enabled: false }).label).toBe('Development / preview');
  });

  it('gives the channels their names and leaves others as they are', () => {
    expect(channelLabel('beta')).toBe('Beta');
    expect(channelLabel('production')).toBe('Production');
    expect(channelLabel('preview')).toBe('preview');
    expect(channelLabel(undefined)).toBe('Not available');
  });
});
