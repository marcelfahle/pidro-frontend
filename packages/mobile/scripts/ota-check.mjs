/**
 * Can the change between two commits reach testers over the air, or does it need a new
 * store build? Used by the beta update workflow (scripts/publish-beta.mjs).
 *
 *   node scripts/ota-check.mjs <base> [head]   # prints ota | build | none, and why
 *
 * Native means anything the binary is built from: ios/ and android/, app.config.*, the
 * native fields of app.json (everything but `web` and `extra`, so also runtimeVersion,
 * version and config plugins), files app.json points at (icon, splash, locales), and any
 * added or upgraded package that ships native code. bun.lock holds every resolved
 * package, so it covers package.json too (CI installs with --frozen-lockfile). A removed
 * package is never native: the binary keeps its code and the JS no longer calls it.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE = 'packages/mobile/';
const APP_PATHS = [MOBILE, 'packages/shared/', 'package.json', 'bun.lock'];
const NATIVE_PATHS = [/^packages\/mobile\/(ios|android)\//, /^packages\/mobile\/app\.config\./];
const JS_ONLY_APP_FIELDS = ['web', 'extra'];

export function otaVerdict({ files, app, packages, isNative }) {
  if (!files.some((file) => APP_PATHS.some((path) => file.startsWith(path))))
    return { verdict: 'none', reasons: ['nothing in the app changed'] };

  const reasons = files.filter((file) => NATIVE_PATHS.some((path) => path.test(file)));

  const [before, after] = [app.before, app.after].map((config) => {
    const expo = { ...config?.expo };
    for (const field of JS_ONLY_APP_FIELDS) delete expo[field];
    return expo;
  });
  if (JSON.stringify(before) !== JSON.stringify(after)) reasons.push('app.json native fields');

  const assets = new Set(
    [before, after].flatMap((expo) => referencedFiles(expo).map((path) => MOBILE + path))
  );
  reasons.push(...files.filter((file) => assets.has(file)));

  for (const [key, entry] of Object.entries(packages.after)) {
    if (packages.before[key]?.[0] !== entry[0] && isNative(key, entry)) reasons.push(entry[0]);
  }

  if (reasons.length) return { verdict: 'build', reasons };
  return { verdict: 'ota', reasons: [] };
}

function referencedFiles(value) {
  if (typeof value === 'string') return value.startsWith('./') ? [posix.normalize(value)] : [];
  if (value && typeof value === 'object') return Object.values(value).flatMap(referencedFiles);
  return [];
}

// bun.lock is JSON with trailing commas.
export function parseLock(text) {
  return text ? JSON.parse(text.replace(/,(\s*[}\]])/g, '$1')) : { packages: {}, workspaces: {} };
}

// A lock key is the package's path through node_modules: "expo", "pidro-mobile/zod",
// "@expo/cli/@expo/config". It may start with a workspace's name.
export function packageDir(root, key, workspaces) {
  const names = key.split('/').reduce((acc, part) => {
    if (acc.at(-1)?.startsWith('@') && !acc.at(-1).includes('/')) acc[acc.length - 1] += `/${part}`;
    else acc.push(part);
    return acc;
  }, []);
  const workspace = Object.entries(workspaces).find(([, { name }]) => name === names[0]);
  const base = workspace && names.length > 1 ? join(root, workspace[0]) : root;
  const rest = workspace && names.length > 1 ? names.slice(1) : names;
  return join(base, ...rest.map((name) => join('node_modules', name)));
}

// Packages ship native code in ios/ or android/, or hook into the build as an Expo
// module, a config plugin or a React Native library with a podspec.
export function shipsNativeCode(dir) {
  const entries = readdirSync(dir);
  return entries.some(
    (entry) =>
      [
        'ios',
        'android',
        'expo-module.config.json',
        'app.plugin.js',
        'react-native.config.js',
      ].includes(entry) || entry.endsWith('.podspec')
  );
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function show(rev, path) {
  try {
    return git('show', `${rev}:${path}`);
  } catch {
    return null;
  }
}

export function checkCommits(base, head, root = git('rev-parse', '--show-toplevel').trim()) {
  const files = git('diff', '--name-only', base, head).split('\n').filter(Boolean);
  const json = (rev, path) => JSON.parse(show(rev, path) ?? 'null');
  const before = parseLock(show(base, 'bun.lock'));
  const after = parseLock(show(head, 'bun.lock'));
  return otaVerdict({
    files,
    app: { before: json(base, `${MOBILE}app.json`), after: json(head, `${MOBILE}app.json`) },
    packages: { before: before.packages, after: after.packages },
    // Not installed: an optional binary for another OS/CPU, else unknown, so native.
    isNative: (key, entry) => {
      const dir = packageDir(root, key, after.workspaces);
      if (existsSync(dir)) return shipsNativeCode(dir);
      const meta = entry[2] ?? {};
      return !(meta.os || meta.cpu);
    },
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [base, head = 'HEAD'] = process.argv.slice(2);
  if (!base) {
    console.error('usage: node scripts/ota-check.mjs <base> [head]');
    process.exit(1);
  }
  const { verdict, reasons } = checkCommits(base, head);
  console.log(verdict);
  for (const reason of reasons) console.log(`  ${reason}`);
}
