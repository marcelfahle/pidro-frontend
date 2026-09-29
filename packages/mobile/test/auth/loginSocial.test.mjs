import { describe, expect, it } from 'bun:test';
import { handleSocialSignInOutcome } from '../../src/features/auth/loginSocial.ts';

const session = {
  token: 'session-token',
  user: { id: 'user-1', username: 'player', email: null },
};
const claim = {
  classic_found: true,
  classic: {
    name: 'Veteran',
    games_played: 321,
    level: 14,
    member_since: '2011-01-02T00:00:00Z',
  },
  ticket: 'claim-ticket',
  expires_at: '2026-09-29T12:10:00Z',
};

function recordingHandlers() {
  const calls = [];
  return {
    calls,
    handlers: {
      onSignedIn: () => calls.push('signed_in'),
      onClassicFound: (value) => calls.push(['classic_found', value]),
      onUnknownIdentity: () => calls.push('unknown_identity'),
    },
  };
}

describe('Sign in social outcomes', () => {
  it('navigates after sign-in and hands Classic matches to the claim callback', () => {
    const signedIn = recordingHandlers();
    handleSocialSignInOutcome({ status: 'signed_in', session }, signedIn.handlers);
    expect(signedIn.calls).toEqual(['signed_in']);

    const classicFound = recordingHandlers();
    handleSocialSignInOutcome({ status: 'classic_found', claim }, classicFound.handlers);
    expect(classicFound.calls).toEqual([['classic_found', claim]]);
  });

  it('shows the quiet unknown-identity path and does nothing on cancel', () => {
    const unknown = recordingHandlers();
    handleSocialSignInOutcome({ status: 'unknown_identity' }, unknown.handlers);
    expect(unknown.calls).toEqual(['unknown_identity']);

    const cancelled = recordingHandlers();
    handleSocialSignInOutcome({ status: 'cancelled', provider: 'facebook' }, cancelled.handlers);
    expect(cancelled.calls).toEqual([]);
  });
});
