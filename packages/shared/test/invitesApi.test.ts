import { describe, expect, it } from 'bun:test';
import { createAuthApi } from '../src/api/auth';
import type { ApiClient } from '../src/api/client';
import { createInvitesApi } from '../src/api/invites';
import { createLobbyApi } from '../src/api/lobby';

function recordingApi(responses: unknown[]) {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  let index = 0;
  const reply = () => Promise.resolve({ data: responses[index++] });
  const api = {
    get: (path: string) => {
      calls.push({ method: 'get', path });
      return reply();
    },
    post: (path: string, body?: unknown) => {
      calls.push({ method: 'post', path, body });
      return reply();
    },
    delete: (path: string) => {
      calls.push({ method: 'delete', path });
      return reply();
    },
  } as unknown as ApiClient;
  return { api, calls };
}

const rawRoom = {
  code: 'ABCD',
  host_id: 'host-1',
  status: 'waiting',
  player_count: 1,
  max_players: 4,
  locked: true,
  seats: {
    north: {
      position: 'north',
      occupant_type: 'human',
      user_id: 'host-1',
      display_name: 'Anna',
      is_owner: true,
      substitute: false,
      has_reservation: false,
    },
  },
};

describe('invite APIs', () => {
  it('creates a guest with the deployed request and response shape', async () => {
    const guest = {
      id: 'guest-1',
      username: 'guest_7KQ4M2XB',
      display_name: 'Anna',
      email: null,
      guest: true,
    };
    const { api, calls } = recordingApi([{ data: { token: 'token', user: guest, state: 'open' } }]);

    const result = await createAuthApi(api).createGuest({
      display_name: 'Anna',
      invite_code: '7KQ4M2XB',
      platform: 'ios',
    });

    expect(calls).toEqual([
      {
        method: 'post',
        path: '/api/v1/auth/guest',
        body: { display_name: 'Anna', invite_code: '7KQ4M2XB', platform: 'ios' },
      },
    ]);
    expect(result.user).toEqual(guest);
  });

  it('previews, mints, regenerates, revokes, and redeems invites', async () => {
    const preview = {
      code: '7KQ4M2XB',
      state: 'open',
      host: 'Marcel',
      seats_taken: 1,
      seats_total: 4,
      seat_hint: 'partner',
      label: 'Anna',
      expires_at: '2026-09-04T00:00:00Z',
    };
    const invite = {
      code: '7KQ4M2XB',
      state: 'open',
      url: 'https://www.pidro.online/j/7KQ4M2XB',
      share_text: 'Join me',
      seat_hint: 'partner',
      label: null,
      expires_at: '2026-09-04T00:00:00Z',
    };
    const { api, calls } = recordingApi([
      { data: { invite: preview } },
      { data: { invite } },
      { data: { invite } },
      {},
      { data: { room: rawRoom, position: 'south', hint_honored: false } },
    ]);
    const invites = createInvitesApi(api);

    expect(await invites.preview('7KQ4M2XB')).toEqual(preview);
    expect(
      await invites.mint('ABCD', { seat_hint: 'partner', label: null, platform: 'ios' }),
    ).toEqual(invite);
    expect(await invites.regenerate('7KQ4M2XB')).toEqual(invite);
    await invites.revoke('7KQ4M2XB');
    const redeemed = await invites.redeem('7KQ4M2XB', { platform: 'ios', source: 'im' });

    expect(redeemed.room.locked).toBe(true);
    expect(redeemed.room.seats?.[0]?.player?.display_name).toBe('Anna');
    expect(calls).toEqual([
      { method: 'get', path: '/api/v1/invites/7KQ4M2XB' },
      {
        method: 'post',
        path: '/api/v1/rooms/ABCD/invites',
        body: { seat_hint: 'partner', label: null, platform: 'ios' },
      },
      { method: 'post', path: '/api/v1/invites/7KQ4M2XB/regenerate', body: undefined },
      { method: 'delete', path: '/api/v1/invites/7KQ4M2XB' },
      {
        method: 'post',
        path: '/api/v1/invites/7KQ4M2XB/redeem',
        body: { platform: 'ios', source: 'im' },
      },
    ]);
  });

  it('uses returned room state for lock, move, and kick controls', async () => {
    const { api, calls } = recordingApi([
      { data: { room: { ...rawRoom, locked: false } } },
      { data: { room: rawRoom } },
      { data: { room: rawRoom } },
    ]);
    const lobby = createLobbyApi(api);

    expect((await lobby.setRoomLocked('ABCD', false)).locked).toBe(false);
    await lobby.movePlayer('ABCD', 'east', 'guest-1');
    await lobby.kickPlayer('ABCD', 'south');

    expect(calls).toEqual([
      { method: 'post', path: '/api/v1/rooms/ABCD/lock', body: { locked: false } },
      {
        method: 'post',
        path: '/api/v1/rooms/ABCD/seat',
        body: { position: 'east', user_id: 'guest-1' },
      },
      { method: 'post', path: '/api/v1/rooms/ABCD/kick', body: { position: 'south' } },
    ]);
  });
});
