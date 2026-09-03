import { afterEach, describe, expect, it } from 'bun:test';
import { createRequire } from 'node:module';
import { createPendingInviteStore } from '../../../shared/src/stores/pendingInvite.ts';
import { redirectSystemPath } from '../../app/+native-intent.tsx';
import { initialRoute } from '../../src/navigation/initialRoute.ts';

const require = createRequire(import.meta.url);
const configPath = require.resolve('../../app.config.js');
const baseConfig = {
  name: 'Pidro 3',
  scheme: 'pidro-mobile',
  ios: { bundleIdentifier: 'com.oneapps.pidro' },
  android: { package: 'com.oneapps.pidro' },
};

afterEach(() => {
  delete process.env.APP_VARIANT;
  delete require.cache[configPath];
});

describe('native invite intent', () => {
  it('rewrites supported links to the join route', () => {
    expect(redirectSystemPath({ path: 'https://www.pidro.online/j/7kq4-m2xb?s=im' })).toBe(
      '/join/7KQ4M2XB?source=im'
    );
    expect(redirectSystemPath({ path: 'pidro-mobile-dev://j/7KQ4M2XB' })).toBe('/join/7KQ4M2XB');
  });

  it('returns a safe local fallback for malformed or unrelated paths', () => {
    expect(redirectSystemPath({ path: 'https://evil.example/j/7KQ4M2XB' })).toBe('/+not-found');
    expect(redirectSystemPath({ path: 'pidro-mobile://j/%37KQ4M2XB' })).toBe('/+not-found');
  });

  it('preserves ordinary app and development-client startup paths', () => {
    expect(redirectSystemPath({ path: '/' })).toBe('/');
    expect(redirectSystemPath({ path: 'pidro-mobile://' })).toBe('/');
    expect(redirectSystemPath({ path: 'pidro-mobile-dev:///' })).toBe('/');
    expect(
      redirectSystemPath({
        path: 'exp+pidro-mobile://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081',
      })
    ).toBe('/');
  });
});

describe('initial route', () => {
  it('waits for both persisted stores and gives an invite precedence', () => {
    expect(initialRoute(false, true, 'unauthenticated', null)).toBeNull();
    expect(initialRoute(true, false, 'unauthenticated', null)).toBeNull();
    expect(
      initialRoute(true, true, 'authenticated', {
        code: '7KQ4M2XB',
        source: 'im',
        receivedAt: 1,
      })
    ).toBe('/join/7KQ4M2XB?source=im');
  });

  it('otherwise follows the existing auth entry behavior', () => {
    expect(initialRoute(true, true, 'authenticated', null)).toBe('/home');
    expect(initialRoute(true, true, 'unauthenticated', null)).toBe('/(auth)/login');
  });

  it('settles startup routing when pending-invite storage cannot be read', async () => {
    const store = createPendingInviteStore({
      storage: {
        getItem: async () => {
          throw new Error('storage unavailable');
        },
        setItem: async () => {},
        removeItem: async () => {},
      },
      storageKey: 'rejecting-pending-invite-test',
    });

    await store.persist.rehydrate();

    expect(store.getState().hydrated).toBe(true);
    expect(initialRoute(true, store.getState().hydrated, 'unauthenticated', null)).toBe(
      '/(auth)/login'
    );
  });
});

describe('resolved variant configuration', () => {
  it.each([
    ['production', 'pidro-mobile', 'com.oneapps.pidro', true],
    ['development', 'pidro-mobile-dev', 'com.marcelfahle.pidro3.dev', false],
    ['preview', 'pidro-mobile-preview', 'com.marcelfahle.pidro3.preview', false],
  ])('keeps %s identifiers and intended links', (variant, scheme, identifier, verifiedAndroid) => {
    process.env.APP_VARIANT = variant;
    delete require.cache[configPath];
    const configure = require(configPath);
    const config = configure({ config: baseConfig });

    expect(config.scheme).toBe(scheme);
    expect(config.ios.bundleIdentifier).toBe(identifier);
    expect(config.ios.associatedDomains).toEqual([
      'applinks:www.pidro.online',
      'applinks:pidro.online',
    ]);
    expect(config.android.package).toBe(identifier);
    expect(config.android.allowBackup).toBe(false);
    if (verifiedAndroid) {
      expect(config.android.intentFilters).toEqual([
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'www.pidro.online', pathPrefix: '/j/' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'pidro.online', pathPrefix: '/j/' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ]);
    } else {
      expect(config.android.intentFilters).toEqual([]);
    }
  });

  it.each(['prevew', 'prod', ''])('rejects an unsupported %j variant', (variant) => {
    process.env.APP_VARIANT = variant;
    delete require.cache[configPath];
    const configure = require(configPath);

    expect(() => configure({ config: baseConfig })).toThrow('Unsupported APP_VARIANT');
  });
});
