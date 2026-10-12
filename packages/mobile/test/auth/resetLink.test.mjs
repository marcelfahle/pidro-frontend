import { describe, expect, it } from 'bun:test';
import { resetLinkRefused } from '../../src/features/auth/resetLink';

describe('reset link', () => {
  it('is refused when the server says the token is invalid or expired', () => {
    expect(resetLinkRefused('INVALID_OR_EXPIRED_PASSWORD_RESET_TOKEN')).toBe(true);
  });

  it('stays usable for any other answer', () => {
    expect(resetLinkRefused('password')).toBe(false);
    expect(resetLinkRefused(undefined)).toBe(false);
  });
});
