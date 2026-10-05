import { describe, expect, it } from 'bun:test';
import type { ApiClient } from '../src/api/client';
import { createAuthApi } from '../src/api/auth';
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
  it('asks for a Classic sign-in link and returns the masked address', async () => {
    const { api, calls } = recordingApi([{ data: { email_hint: 'be•••••@gmail.com' } }]);

    await expect(
      createClassicApi(api).requestSignInLink({
        login: 'Bengt',
        install_id: 'install-1',
      })
    ).resolves.toEqual({ email_hint: 'be•••••@gmail.com' });

    expect(calls).toEqual([
      {
        path: '/api/v1/classic/sign-in-link',
        body: { login: 'Bengt', install_id: 'install-1' },
        config: { preserveSessionOnUnauthorized: true },
      },
    ]);
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

  it('reports whether an email already has an account', async () => {
    const { api, calls } = recordingApi([{ data: { known: true } }, { data: { known: false } }]);
    const auth = createAuthApi(api);

    await expect(auth.lookupEmail('bengt@example.com')).resolves.toBe('known');
    await expect(auth.lookupEmail('new@example.com')).resolves.toBe('unknown');

    expect(calls.map(({ path, body }) => ({ path, body }))).toEqual([
      { path: '/api/v1/auth/identify', body: { email: 'bengt@example.com' } },
      { path: '/api/v1/auth/identify', body: { email: 'new@example.com' } },
    ]);
  });
});
