import { describe, expect, it } from 'bun:test';
import type { ApiClient } from '../src/api/client';
import { createClassicApi } from '../src/api/classic';

function recordingApi() {
  const calls: Array<{ path: string; body: unknown; config: unknown }> = [];
  const responses = [
    {
      data: {
        ticket: 'claim-ticket',
        expires_at: '2026-10-01T12:00:00Z',
        classic: {
          name: 'Veteran',
          games_played: 4321,
          level: 27,
          member_since: '2012-04-03T00:00:00Z',
          name_allowed: false,
        },
      },
    },
    {
      data: {
        token: 'session-token',
        user: { id: 'user-1', email: null, username: 'veteran', guest: true },
      },
    },
  ];
  const api = {
    post: async (path: string, body: unknown, config: unknown) => {
      calls.push({ path, body, config });
      return { status: 200, data: responses.shift() };
    },
  } as unknown as ApiClient;
  return { classic: createClassicApi(api), calls };
}

describe('Classic claim API', () => {
  it('keeps verification credentials and claim account data in their typed envelopes', async () => {
    const { classic, calls } = recordingApi();

    await expect(
      classic.verify({
        method: 'password',
        login: 'old@example.com',
        password: 'classic-password',
        install_id: 'install-1',
      })
    ).resolves.toMatchObject({
      ticket: 'claim-ticket',
      classic: { name_allowed: false },
    });
    await expect(
      classic.claim({
        ticket: 'claim-ticket',
        install_id: 'install-1',
        account: { username: 'veteran', display_name: 'New Name' },
      })
    ).resolves.toMatchObject({
      token: 'session-token',
      user: { id: 'user-1' },
    });

    expect(calls.map(({ path, body }) => ({ path, body }))).toEqual([
      {
        path: '/api/v1/classic/verify',
        body: {
          method: 'password',
          login: 'old@example.com',
          password: 'classic-password',
          install_id: 'install-1',
        },
      },
      {
        path: '/api/v1/classic/claim',
        body: {
          ticket: 'claim-ticket',
          install_id: 'install-1',
          account: { username: 'veteran', display_name: 'New Name' },
        },
      },
    ]);
    for (const call of calls) {
      expect(call.config).toMatchObject({
        preserveSessionOnUnauthorized: true,
      });
    }
  });
});
