import { describe, expect, it } from 'bun:test';
import { shouldAutoReadySolo } from '../../src/features/game/soloReadiness';

const readiness = {
  room_id: 'room-1',
  ready_epoch: 1,
  snapshot_revision: 1,
  status: 'waiting',
  positions: { north: 'player-1', east: 'bot-1', south: 'bot-2', west: 'bot-3' },
  seats: {
    north: { occupant_type: 'human', status: 'connected', user_id: 'player-1' },
    east: { occupant_type: 'bot', status: 'connected', user_id: 'bot-1' },
    south: { occupant_type: 'bot', status: 'connected', user_id: 'bot-2' },
    west: { occupant_type: 'bot', status: 'connected', user_id: 'bot-3' },
  },
  ready_players: ['east', 'south', 'west'],
};

describe('solo launch readiness', () => {
  it('auto-confirms exactly the waiting human at a full three-bot table', () => {
    expect(shouldAutoReadySolo(readiness, 'north')).toBe(true);
    expect(shouldAutoReadySolo({ ...readiness, ready_players: [...readiness.ready_players, 'north'] }, 'north')).toBe(
      false
    );
    expect(
      shouldAutoReadySolo(
        {
          ...readiness,
          seats: {
            ...readiness.seats,
            west: { occupant_type: 'human', status: 'connected', user_id: 'player-2' },
          },
        },
        'north'
      )
    ).toBe(false);
  });
});
