import { describe, expect, it } from 'bun:test';

const { handleClassicFound, takePendingClassicClaim } =
  await import('../../src/features/auth/classicFound.ts');

describe('Classic provider handoff', () => {
  it('keeps the claim ticket out of navigation and consumes it once', () => {
    handleClassicFound(
      {
        classic_found: true,
        ticket: 'short-lived-ticket',
        expires_at: '2026-09-30T12:00:00Z',
        classic: {
          name: 'Veteran',
          games_played: 1234,
          level: 42,
          member_since: '2012-04-03T00:00:00Z',
          name_allowed: true,
        },
      },
      'apple'
    );

    expect(takePendingClassicClaim()).toEqual({
      method: 'apple',
      verification: {
        ticket: 'short-lived-ticket',
        expires_at: '2026-09-30T12:00:00Z',
        classic: {
          name: 'Veteran',
          games_played: 1234,
          level: 42,
          member_since: '2012-04-03T00:00:00Z',
          name_allowed: true,
        },
      },
    });
    expect(takePendingClassicClaim()).toBeNull();
  });

  it('requires a replacement public name when an older response omits name_allowed', () => {
    handleClassicFound(
      {
        classic_found: true,
        ticket: 'older-ticket',
        expires_at: '2026-09-30T12:00:00Z',
        classic: {
          name: 'Old Name',
          games_played: 5,
          level: 2,
          member_since: '2016-01-01T00:00:00Z',
        },
      },
      'facebook'
    );

    expect(takePendingClassicClaim()?.verification.classic.name_allowed).toBe(false);
  });
});
