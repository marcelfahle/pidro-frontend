import { afterEach, describe, expect, it } from 'bun:test';
import {
  e2eSocialAvailability,
  e2eSocialCredential,
} from '../../src/features/auth/e2eProviders.ts';

const flag = process.env.EXPO_PUBLIC_E2E;
globalThis.__DEV__ = true;

afterEach(() => {
  globalThis.__DEV__ = true;
  if (flag === undefined) delete process.env.EXPO_PUBLIC_E2E;
  else process.env.EXPO_PUBLIC_E2E = flag;
  delete globalThis.__pidroE2E;
});

describe('the account journeys’ sign-in seam', () => {
  it('does nothing unless the build asked for it', async () => {
    delete process.env.EXPO_PUBLIC_E2E;
    globalThis.__pidroE2E = { status: 'cancelled', provider: 'apple' };

    expect(e2eSocialAvailability()).toBeNull();
    expect(await e2eSocialCredential('apple')).toBeNull();
  });

  // Metro reuses a cached transform without looking at EXPO_PUBLIC_* values, so a release export
  // can inline a flag an earlier export was given. A release bundle has __DEV__ false.
  it('does nothing in a release bundle, even with the flag', async () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    globalThis.__DEV__ = false;
    globalThis.__pidroE2E = { status: 'cancelled', provider: 'apple' };

    expect(e2eSocialAvailability()).toBeNull();
    expect(await e2eSocialCredential('apple')).toBeNull();
  });

  it('offers both providers and returns the journey’s answer when asked', async () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    globalThis.__pidroE2E = { status: 'cancelled', provider: 'apple' };

    expect(e2eSocialAvailability()).toEqual({ apple: true, facebook: true });
    expect(await e2eSocialCredential('apple')).toEqual({ status: 'cancelled', provider: 'apple' });
  });

  it('fails readably when the journey gave no answer', async () => {
    process.env.EXPO_PUBLIC_E2E = '1';

    expect(await e2eSocialCredential('facebook')).toMatchObject({
      status: 'failure',
      provider: 'facebook',
    });
  });
});
