import { describe, expect, it } from 'bun:test';
import { AxiosError } from 'axios';
import { createApiClient, type ApiClient } from '../src/api/client';
import { createAuthApi } from '../src/api/auth';

const user = {
  id: 'user-1',
  email: 'player@example.com',
  username: 'player',
};

function providerApi(response: { status: number; data: unknown }) {
  const calls: Array<{ path: string; body: unknown; config: unknown }> = [];
  const api = {
    post: async (path: string, body: unknown, config: unknown) => {
      calls.push({ path, body, config });
      return response;
    },
  } as unknown as ApiClient;
  return { auth: createAuthApi(api), calls };
}

describe('provider authentication API', () => {
  it('sends each provider token with the persistent install id', async () => {
    const apple = providerApi({
      status: 200,
      data: { data: { token: 'session', user } },
    });
    const facebook = providerApi({
      status: 200,
      data: { data: { token: 'session', user } },
    });

    expect(await apple.auth.providerLogin('apple', 'apple-token', 'install-1')).toEqual({
      status: 'signed_in',
      session: { token: 'session', user },
    });
    expect(await facebook.auth.providerLogin('facebook', 'facebook-token', 'install-2')).toEqual({
      status: 'signed_in',
      session: { token: 'session', user },
    });
    expect(apple.calls[0]).toMatchObject({
      path: '/api/v1/auth/apple',
      body: { identity_token: 'apple-token', install_id: 'install-1' },
    });
    expect(facebook.calls[0]).toMatchObject({
      path: '/api/v1/auth/facebook',
      body: { access_token: 'facebook-token', install_id: 'install-2' },
    });
  });

  it('normalizes Classic matches and expected 401 responses', async () => {
    const claim = {
      classic_found: true as const,
      classic: {
        name: 'Veteran',
        games_played: 321,
        level: 14,
        member_since: '2011-01-02T00:00:00Z',
      },
      ticket: 'claim-ticket',
      expires_at: '2026-09-29T12:10:00Z',
    };
    const classic = providerApi({ status: 200, data: { data: claim } });
    const unknown = providerApi({ status: 401, data: { errors: [] } });

    expect(await classic.auth.providerLogin('apple', 'token', 'install')).toEqual({
      status: 'classic_found',
      claim,
    });
    expect(await unknown.auth.providerLogin('facebook', 'token', 'install')).toEqual({
      status: 'unknown_identity',
    });

    const config = unknown.calls[0].config as {
      validateStatus: (status: number) => boolean;
    };
    expect(config.validateStatus(401)).toBe(true);
    expect(config.validateStatus(500)).toBe(false);
  });

  it('preserves an existing session for provider 401s but clears it for protected requests', async () => {
    let sessionClearCount = 0;
    const api = createApiClient({
      config: { baseURL: 'https://example.test', timeout: 1000 },
      getToken: () => 'existing-guest-token',
      clearSession: () => {
        sessionClearCount += 1;
      },
    });
    api.defaults.adapter = async (config) => {
      const response = {
        data: { errors: [{ code: 'INVALID_CREDENTIALS' }] },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      };
      if (config.validateStatus?.(response.status)) return response;
      throw new AxiosError(
        'Request failed with status code 401',
        undefined,
        config,
        undefined,
        response
      );
    };

    expect(await createAuthApi(api).providerLogin('apple', 'token', 'install')).toEqual({
      status: 'unknown_identity',
    });
    expect(sessionClearCount).toBe(0);

    await expect(api.get('/api/v1/auth/me')).rejects.toBeInstanceOf(AxiosError);
    expect(sessionClearCount).toBe(1);
  });
});
