import type { EmailLookup } from '@pidro/shared';

/**
 * What we know about an email before asking for a password. `unchecked` means
 * the lookup could not answer; the flow then treats the address as new and
 * lets account creation report an address that is already in use.
 */
export type EmailStanding = EmailLookup | 'unchecked';

export function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function emailStanding(
  email: string,
  lookup: (email: string) => Promise<EmailLookup>
): Promise<EmailStanding> {
  try {
    return await lookup(email);
  } catch {
    return 'unchecked';
  }
}
