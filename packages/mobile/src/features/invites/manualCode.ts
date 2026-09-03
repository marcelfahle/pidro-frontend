import { normalizeInviteCode } from '@pidro/shared';

export function formatManualInviteCode(value: string): string {
  const compact = value
    .replace(/[\s-]/g, '')
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  return compact.length > 4 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact;
}

export function parseManualInviteCode(value: string): string | null {
  return normalizeInviteCode(formatManualInviteCode(value));
}

export function manualInviteRoute(value: string): string | null {
  const code = parseManualInviteCode(value);
  return code ? `/join/${code}?source=typed` : null;
}
