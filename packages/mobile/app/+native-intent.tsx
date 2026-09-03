import { parseInviteLink } from '@pidro/shared';

const APP_SCHEMES = new Set(['pidro-mobile:', 'pidro-mobile-dev:', 'pidro-mobile-preview:']);

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
  const invite = parseInviteLink(path);
  if (!invite) return isAppStartupPath(path) ? '/' : '/+not-found';

  const source = invite.source ? `?source=${invite.source}` : '';
  return `/join/${invite.code}${source}`;
}
