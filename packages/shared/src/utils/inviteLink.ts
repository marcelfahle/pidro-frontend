export const INVITE_SOURCES = ['wa', 'im', 'sms', 'qr', 'copy'] as const;
export type InviteSource = (typeof INVITE_SOURCES)[number];

const INVITE_HOSTS = new Set(['www.pidro.online', 'pidro.online']);
const INVITE_SCHEMES = new Set(['pidro-mobile:', 'pidro-mobile-dev:', 'pidro-mobile-preview:']);
const INVITE_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/;

export interface ParsedInviteLink {
  code: string;
  source?: InviteSource;
}

export function normalizeInviteCode(value: string): string | null {
  const code = value
    .replace(/-/g, '')
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}

export function isInviteSource(value: string | null | undefined): value is InviteSource {
  return INVITE_SOURCES.includes(value as InviteSource);
}

export function parseInviteLink(value: string): ParsedInviteLink | null {
  const bareCode = normalizeInviteCode(value);
  if (bareCode) return { code: bareCode };

  try {
    const relative = value.startsWith('/');
    const url = new URL(value, 'https://www.pidro.online');
    let rawCode: string | undefined;
    if (url.username || url.password) return null;

    if (relative || url.protocol === 'https:') {
      if (!INVITE_HOSTS.has(url.hostname)) return null;
      const path = url.pathname.split('/');
      if (path.length !== 3 || path[1] !== 'j') return null;
      rawCode = path[2];
    } else if (INVITE_SCHEMES.has(url.protocol)) {
      const path = url.pathname.split('/');
      if (url.hostname === 'j' && path.length === 2) rawCode = path[1];
      if (!url.hostname && path.length === 3 && path[1] === 'j') rawCode = path[2];
    } else {
      return null;
    }

    if (!rawCode || rawCode.includes('%')) return null;
    const code = normalizeInviteCode(rawCode);
    if (!code) return null;

    const source = url.searchParams.get('s') ?? url.searchParams.get('source');
    return isInviteSource(source) ? { code, source } : { code };
  } catch {
    return null;
  }
}
