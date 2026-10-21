import { expect, test } from 'bun:test';

test('selection haptics use the live setting on native, stay silent on web and tolerate unavailable feedback', () => {
  // Native module mocks must not replace the socket tests' React Native exports.
  const result = Bun.spawnSync(
    [
      process.execPath,
      '-e',
      `
      import { mock } from 'bun:test';
      import assert from 'node:assert/strict';
      const platform = { OS: 'ios' };
      const settings = { hapticEnabled: true };
      const selection = mock(async () => {});
      const android = mock(async () => {});
      mock.module('react-native', () => ({ Platform: platform }));
      mock.module('expo-haptics', () => ({
        selectionAsync: selection,
        performAndroidHapticsAsync: android,
        AndroidHaptics: { Segment_Tick: 'segment-tick' },
      }));
      mock.module('./src/stores/settings.ts', () => ({
        useSettingsStore: { getState: () => settings },
      }));
      const { playSelectionHaptic, runHaptic } = await import('./src/utils/haptics.ts');
      playSelectionHaptic();
      assert.equal(selection.mock.calls.length, 1);
      assert.equal(android.mock.calls.length, 0);
      platform.OS = 'android';
      playSelectionHaptic();
      assert.deepEqual(android.mock.calls, [['segment-tick']]);
      assert.equal(selection.mock.calls.length, 1);
      settings.hapticEnabled = false;
      playSelectionHaptic();
      assert.equal(android.mock.calls.length, 1);
      settings.hapticEnabled = true;
      platform.OS = 'web';
      playSelectionHaptic();
      assert.equal(android.mock.calls.length, 1);
      assert.equal(selection.mock.calls.length, 1);
      const effect = mock(async () => {});
      runHaptic(effect);
      platform.OS = 'ios';
      settings.hapticEnabled = false;
      runHaptic(effect);
      assert.equal(effect.mock.calls.length, 0);
      settings.hapticEnabled = true;
      runHaptic(effect);
      assert.equal(effect.mock.calls.length, 1);
      selection.mockImplementationOnce(() => Promise.reject(new Error('unavailable')));
      assert.equal(playSelectionHaptic(), undefined);
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.equal(selection.mock.calls.length, 2);
      `,
    ],
    { cwd: new URL('..', import.meta.url).pathname, stdout: 'pipe', stderr: 'pipe' }
  );
  expect(result.stderr.toString()).toBe('');
  expect(result.exitCode).toBe(0);
});
