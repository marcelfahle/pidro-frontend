import { expect, test } from 'bun:test';
import { createAuthStore } from '../src/stores/auth';
import type { SeatInvitation } from '../src/types/lobby';

test('invitation events replace an exact seat, preserve other seats, and never survive a session change', () => {
  let saved = '';
  const store = createAuthStore({ storage: { getItem: () => null, setItem: (_key, value) => { saved = value; }, removeItem: () => {} } });
  const user = { id: 'viewer', username: 'Viewer', email: null };
  store.getState().setSession({ accessToken: 'token', user });
  const first: SeatInvitation = { code: 'ABCD', position: 'east', host_id: 'host' };
  const other: SeatInvitation = { ...first, position: 'west' };
  store.getState().setSeatInvitations([first, other]);
  const updated = { ...first, host: { user_id: 'host', display_name: 'Nora', avatar_url: null } };
  store.getState().receiveSeatInvitation(updated);
  expect(store.getState().seatInvitations).toEqual([other, updated]);
  store.getState().removeSeatInvitation(other);
  expect(store.getState().seatInvitations).toEqual([updated]);
  store.getState().setSession({ accessToken: 'renewed', user });
  expect(store.getState().seatInvitations).toEqual([updated]);
  expect(JSON.parse(saved).state).not.toHaveProperty('seatInvitations');
  store.getState().setSession({ accessToken: 'other', user: { ...user, id: 'someone-else' } });
  expect(store.getState().seatInvitations).toEqual([]);
  store.getState().receiveSeatInvitation(first);
  store.getState().clearSession();
  expect(store.getState().seatInvitations).toEqual([]);
});
