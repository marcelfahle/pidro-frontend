import { describe, expect, it } from 'bun:test';
import { setLocale } from '@pidro/shared';
import {
  availableMoveTargets,
  canManageRoom,
  firstUnfilledSeat,
  friendSeatTitle,
  inviteShareMessage,
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
  it('opens the first unfilled seat and names its relationship to the current host seat', () => {
    expect(firstUnfilledSeat(room)).toBe('south');
    expect(friendSeatTitle(room, 'south')).toBe('Partner');
    const held = {
      ...room,
      seats: room.seats.map((seat) =>
        seat.position === 'south' ? { ...seat, held_for: { user_id: 'friend' } } : seat
      ),
    };
    expect(firstUnfilledSeat(held)).toBe('west');
    expect(availableMoveTargets(held, 'east')).toEqual(['west']);
    expect(friendSeatTitle({ ...room, host_id: 'guest-1' }, 'west')).toBe('Partner');
    expect(friendSeatTitle({ ...room, host_id: 'guest-1' }, 'south')).toBe('Opponent');
    expect(
      firstUnfilledSeat({ ...held, positions: { ...held.positions, west: 'last' } })
    ).toBeUndefined();
  });

  it('shares in the current locale with the original URL and dashed invite code', () => {
    const invite = {
      url: 'https://example.com/i/7KQ4M2XB',
      code: '7KQ4M2XB',
      share_text: 'Server English',
    };
    try {
      setLocale('en');
      expect(inviteShareMessage(invite)).toBe(
        'Come play Pidro with me 🃏 https://example.com/i/7KQ4M2XB — code 7KQ4-M2XB'
      );
      setLocale('sv');
      expect(inviteShareMessage(invite)).toBe(
        'Kom och spela Pidro med mig 🃏 https://example.com/i/7KQ4M2XB — kod 7KQ4-M2XB'
      );
    } finally {
      setLocale('en');
    }
  });

  it('only exposes controls to the room host while waiting', () => {
    expect(canManageRoom(room, 'host-1', 'player')).toBe(true);
    expect(canManageRoom(room, 'guest-1', 'player')).toBe(false);
    expect(canManageRoom({ ...room, status: 'playing' }, 'host-1', 'player')).toBe(false);
  });

  it('rejects stale host ownership until the server confirms a player role', () => {
    expect(canManageRoom(room, 'host-1', 'spectator')).toBe(false);
    expect(canManageRoom(room, 'host-1', null)).toBe(false);
    expect(canManageRoom({ ...room, status: 'ready' }, 'host-1', 'spectator')).toBe(false);
    expect(canManageRoom({ ...room, status: 'ready' }, 'host-1', 'player')).toBe(true);
  });

  it('uses the chosen name for generated guests and offers only open move targets', () => {
    expect(seatDisplayName(room.seats[1].player)).toBe('Anna');
    expect(availableMoveTargets(room, 'east')).toEqual(['south', 'west']);
  });
});
