import { describe, expect, it } from 'bun:test';
import type { ApiClient } from '../src/api/client';
import { createClassicApi } from '../src/api/classic';

function recordingApi(responses: unknown[]) {
  const calls: Array<{ path: string; body: unknown; config: unknown }> = [];
  const api = {
    post: async (path: string, body: unknown, config: unknown) => {
      calls.push({ path, body, config });
      return { status: 200, data: responses.shift() };
    },
  } as unknown as ApiClient;
  return { api, calls };
}

describe('account recovery API', () => {
  it('asks for a Classic sign-in code and returns the masked address', async () => {
    const { api, calls } = recordingApi([{ data: { email_hint: 'be•••••@gmail.com' } }]);

    await expect(
      createClassicApi(api).requestSignInCode({
        login: 'Bengt',
        install_id: 'install-1',
      })
    ).resolves.toEqual({ email_hint: 'be•••••@gmail.com' });

    expect(calls).toEqual([
      {
        path: '/api/v1/classic/sign-in-code',
        body: { login: 'Bengt', install_id: 'install-1' },
        config: { preserveSessionOnUnauthorized: true },
      },
    ]);
  });

  it('verifies a code without losing leading zeros or invalidating a signed-in session', async () => {
    const verification = {
      ticket: 'ticket',
      expires_at: '2099-01-01T00:00:00Z',
      classic: { name: 'Bengt', games_played: 123, level: 4, member_since: null, name_allowed: true },
    };
    const { api, calls } = recordingApi([{ data: verification }]);
    await expect(createClassicApi(api).verifySignInCode({
      login: 'Bengt', code: '000017', install_id: 'install-1',
    })).resolves.toEqual(verification);
    expect(calls).toEqual([{
      path: '/api/v1/classic/sign-in-code/verify',
      body: { login: 'Bengt', code: '000017', install_id: 'install-1' },
      config: { preserveSessionOnUnauthorized: true },
    }]);
  });

  it('sends a Classic help request as the player wrote it', async () => {
    const { api, calls } = recordingApi([{ data: {} }]);

    await createClassicApi(api).requestHelp({
      name: 'Bengt',
      email: 'bengt@example.com',
      details: 'Last played in 2019',
    });

    expect(calls).toEqual([
      {
        path: '/api/v1/classic/help',
        body: {
          name: 'Bengt',
          email: 'bengt@example.com',
          details: 'Last played in 2019',
        },
        config: { preserveSessionOnUnauthorized: true },
      },
    ]);
  });
});
