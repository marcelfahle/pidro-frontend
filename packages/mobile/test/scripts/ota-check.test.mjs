import { describe, expect, test } from 'bun:test';
import { otaVerdict, packageDir } from '../../scripts/ota-check.mjs';

const app = {
  expo: {
    version: '3.2.0',
    runtimeVersion: { policy: 'appVersion' },
    plugins: ['expo-router'],
    splash: { image: './assets/splash.png' },
    web: { favicon: './assets/favicon.png' },
    extra: { router: {} },
  },
};
const packages = {
  zod: ['zod@4.3.6', '', {}, 'sha'],
  'expo-haptics': ['expo-haptics@56.0.3', '', {}, 'sha'],
};
const native = new Set(['expo-haptics', 'expo-camera']);

function check({ files, after = app, lock = packages }) {
  return otaVerdict({
    files,
    app: { before: app, after },
    packages: { before: packages, after: lock },
    isNative: (key) => native.has(key),
  });
}

const withExpo = (fields) => ({ expo: { ...app.expo, ...fields } });

describe('the native check', () => {
  test('says OTA for a JS-only change, in the app or the shared package', () => {
    expect(check({ files: ['packages/mobile/src/features/seatName.ts'] }).verdict).toBe('ota');
    expect(check({ files: ['packages/shared/src/api/rooms.ts'] }).verdict).toBe('ota');
    expect(
      check({
        files: ['bun.lock'],
        lock: { ...packages, zod: ['zod@4.4.0', '', {}, 'sha'] },
      }).verdict
    ).toBe('ota');
  });

  test('says a new build is needed for a native change', () => {
    const build = (change) => {
      const result = check(change);
      expect(result.verdict).toBe('build');
      return result.reasons;
    };
    expect(build({ files: ['packages/mobile/ios/Pidro/Info.plist'] })).toEqual([
      'packages/mobile/ios/Pidro/Info.plist',
    ]);
    expect(build({ files: ['packages/mobile/app.config.js'] })).toEqual([
      'packages/mobile/app.config.js',
    ]);
    expect(
      build({ files: ['packages/mobile/app.json'], after: withExpo({ version: '3.3.0' }) })
    ).toEqual(['app.json native fields']);
    expect(
      build({
        files: ['packages/mobile/app.json'],
        after: withExpo({ plugins: ['expo-router', 'expo-camera'] }),
      })
    ).toEqual(['app.json native fields']);
    // The splash image is baked into the binary; app.json does not change with it.
    expect(build({ files: ['packages/mobile/assets/splash.png'] })).toEqual([
      'packages/mobile/assets/splash.png',
    ]);
    expect(
      build({
        files: ['packages/mobile/package.json', 'bun.lock'],
        lock: { ...packages, 'expo-camera': ['expo-camera@56.0.2', '', {}, 'sha'] },
      })
    ).toEqual(['expo-camera@56.0.2']);
    expect(
      build({
        files: ['bun.lock'],
        lock: { ...packages, 'expo-haptics': ['expo-haptics@56.0.4', '', {}, 'sha'] },
      })
    ).toEqual(['expo-haptics@56.0.4']);
  });

  test('lets JS-only app.json fields and removed packages through', () => {
    expect(
      check({
        files: ['packages/mobile/app.json', 'packages/mobile/assets/favicon.png'],
        after: withExpo({ web: { favicon: './assets/icon.png' }, extra: { router: { a: 1 } } }),
      }).verdict
    ).toBe('ota');
    expect(check({ files: ['bun.lock'], lock: { zod: packages.zod } }).verdict).toBe('ota');
  });

  test('has nothing to publish when the app did not change', () => {
    expect(check({ files: ['AGENTS.md', 'packages/web/src/main.ts'] }).verdict).toBe('none');
  });
});

test('finds a locked package where bun installed it', () => {
  const workspaces = { '': { name: 'pidro' }, 'packages/mobile': { name: 'pidro-mobile' } };
  expect(packageDir('/r', 'expo', workspaces)).toBe('/r/node_modules/expo');
  expect(packageDir('/r', 'pidro-mobile/zod', workspaces)).toBe(
    '/r/packages/mobile/node_modules/zod'
  );
  expect(packageDir('/r', '@expo/cli/@expo/config', workspaces)).toBe(
    '/r/node_modules/@expo/cli/node_modules/@expo/config'
  );
  expect(packageDir('/r', 'pidro-mobile', workspaces)).toBe('/r/node_modules/pidro-mobile');
});
