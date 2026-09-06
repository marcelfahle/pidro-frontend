import { afterEach, expect, it } from 'bun:test';
import { useGameStore } from '../src/stores/game';
import { normalizeRoom } from '../src/utils/rooms';

const room = (url: string | null, id = 'player') =>
  normalizeRoom({
    code: 'TEST',
    seats: { north: { user_id: id, username: 'Anna', avatar_url: url } },
  });
afterEach(() => useGameStore.getState().reset());

it('keeps avatar identity from REST and refreshes replacement and explicit removal', () => {
  useGameStore.getState().initFromRoom({ room: room('old'), youPlayerId: 'player' });
  expect(useGameStore.getState().playerMeta.north.avatar_url).toBe('old');
  useGameStore.getState().setSeatStatus('north', 'reconnecting');
  useGameStore.getState().refreshPlayerIdentities(room('new'));
  expect(useGameStore.getState().playerMeta.north.avatar_url).toBe('new');
  expect(useGameStore.getState().playerMeta.north.seatStatus).toBe('reconnecting');
  useGameStore.getState().refreshPlayerIdentities(room(null));
  expect(useGameStore.getState().playerMeta.north.avatar_url).toBeNull();
});

it('does not apply another occupant or room identity to an active seat', () => {
  useGameStore.getState().initFromRoom({ room: room('old'), youPlayerId: 'player' });
  useGameStore.getState().refreshPlayerIdentities(room('other', 'other'));
  useGameStore.getState().refreshPlayerIdentities({ ...room('other'), code: 'ELSE' });
  expect(useGameStore.getState().playerMeta.north.avatar_url).toBe('old');
});
