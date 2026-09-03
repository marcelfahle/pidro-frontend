import { describe, expect, it } from 'bun:test';
import {
  formatManualInviteCode,
  manualInviteRoute,
  parseManualInviteCode,
} from '../../src/features/invites/manualCode.ts';

describe('manual invite code entry', () => {
  it('formats pasted codes and applies Crockford aliases', () => {
    expect(formatManualInviteCode(' 7kq4-mixb ')).toBe('7KQ4-M1XB');
    expect(parseManualInviteCode(' 7kq4-mixb ')).toBe('7KQ4M1XB');
  });

  it('rejects incomplete, overlong, and excluded input', () => {
    expect(parseManualInviteCode('7KQ4')).toBeNull();
    expect(parseManualInviteCode('7KQ4M2XBU')).toBeNull();
    expect(parseManualInviteCode('7KQ4-U2XB')).toBeNull();
  });

  it('routes valid codes through the existing typed join flow', () => {
    expect(manualInviteRoute('7kq4-m2xb')).toBe('/join/7KQ4M2XB?source=typed');
    expect(manualInviteRoute('bad')).toBeNull();
  });
});
