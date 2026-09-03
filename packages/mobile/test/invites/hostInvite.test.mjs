import { describe, expect, it } from 'bun:test';
import {
  availableMoveTargets,
  canManageRoom,
  seatDisplayName,
} from '../../src/features/invites/hostControls.ts';

const room = {
  code: 'ABCD',
  host_id: 'host-1',
  status: 'waiting',
  positions: { north: 'host-1', east: 'guest-1', south: null, west: null },
  seats: [
    {
      seat_index: 0,
      position: 'north',
      status: 'occupied',
      player: { id: 'host-1', username: 'host' },
    },
    {
      seat_index: 1,
      position: 'east',
      status: 'occupied',
      player: { id: 'guest-1', username: 'guest_7KQ4M2XB', display_name: 'Anna' },
    },
    { seat_index: 2, position: 'south', status: 'free', player: null },
    { seat_index: 3, position: 'west', status: 'free', player: null },
  ],
};

describe('waiting-table host controls', () => {
  it('only exposes controls to the room host while waiting', () => {
    expect(canManageRoom(room, 'host-1')).toBe(true);
    expect(canManageRoom(room, 'guest-1')).toBe(false);
    expect(canManageRoom({ ...room, status: 'playing' }, 'host-1')).toBe(false);
  });

  it('prefers display names and offers only open move targets', () => {
    expect(seatDisplayName(room.seats[1].player)).toBe('Anna');
    expect(availableMoveTargets(room, 'east')).toEqual(['south', 'west']);
  });
});
