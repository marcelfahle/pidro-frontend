import { describe, expect, it } from 'bun:test';
import { claimDailyGuestSavePrompt, localDateKey } from '../../src/features/auth/guestSavePrompt';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
}

describe('guest save prompt timing', () => {
  it('uses the local calendar date rather than UTC', () => {
    expect(localDateKey(new Date(2026, 8, 29, 23, 59))).toBe('2026-09-29');
  });

  it('claims at most one prompt per guest and local day', async () => {
    const storage = memoryStorage();
    expect(await claimDailyGuestSavePrompt('guest-a', new Date(2026, 8, 29), storage)).toBe(true);
    expect(await claimDailyGuestSavePrompt('guest-a', new Date(2026, 8, 29, 23), storage)).toBe(
      false
    );
    expect(await claimDailyGuestSavePrompt('guest-b', new Date(2026, 8, 29), storage)).toBe(true);
    expect(await claimDailyGuestSavePrompt('guest-a', new Date(2026, 8, 30), storage)).toBe(true);
  });
});
