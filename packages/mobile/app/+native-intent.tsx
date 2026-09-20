import { parseInviteLink } from '@pidro/shared';

const APP_SCHEMES = new Set(['pidro-mobile:', 'pidro-mobile-dev:', 'pidro-mobile-preview:']);

/**
 * Dev harness routes opened straight from a simulator (`just table-sim`,
 * `xcrun simctl openurl … exp://host/--/table-dev?phase=bidding`). Without this
 * allowlist the catch-all below swallows them into +not-found, which silently
 * costs the whole fixture loop. Release builds never reach it — the routes
 * themselves are `__DEV__`-guarded too.
 */
const DEV_FIXTURE_ROUTES = new Set(['table-dev', 'ui-dev', 'auth-flow-dev']);

function devFixturePath(path: string): string | null {
  if (!__DEV__) return null;

  let route: string;
  try {
    const url = new URL(path);
    // Only our own schemes and Expo's dev schemes may open a harness route.
    if (!APP_SCHEMES.has(url.protocol) && !url.protocol.startsWith('exp')) return null;
    // Expo Go and the dev client carry the in-app route after `/--/`.
    const marker = path.indexOf('/--/');
    route = marker >= 0 ? path.slice(marker + 4) : `${url.hostname}${url.pathname}${url.search}`;
  } catch {
    if (!path.startsWith('/')) return null;
    route = path;
  }

  route = route.replace(/^\/+/, '');
  const name = route.split(/[?#]/)[0].replace(/\/+$/, '');
  return DEV_FIXTURE_ROUTES.has(name) ? `/${route}` : null;
}

function isAppStartupPath(path: string): boolean {
  if (path === '' || path === '/') return true;

  try {
    const url = new URL(path);
    if (
      APP_SCHEMES.has(url.protocol) &&
      !url.hostname &&
      (url.pathname === '' || url.pathname === '/')
    ) {
      return true;
    }
    return url.protocol === 'exp+pidro-mobile:' && url.hostname === 'expo-development-client';
  } catch {
    return false;
  }
}

export function redirectSystemPath({ path }: { path: string; initial?: boolean }): string {
  const fixture = devFixturePath(path);
  if (fixture) return fixture;

  const invite = parseInviteLink(path);
  if (!invite) return isAppStartupPath(path) ? '/' : '/+not-found';

  const source = invite.source ? `?source=${invite.source}` : '';
  return `/join/${invite.code}${source}`;
}
