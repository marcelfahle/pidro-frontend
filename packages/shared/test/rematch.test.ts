import { describe, expect, test } from 'bun:test';
import type { Position, ReadinessSnapshot } from '../src/types/lobby';
import { rematchVote } from '../src/utils/rematch';

const positions: Position[] = ['north', 'east', 'south', 'west'];

function finished(ready: Position[], bots: Position[] = []): ReadinessSnapshot {
  return {
    room_id: 'room-1',
    ready_epoch: 5,
    snapshot_revision: 9,
    status: 'finished',
    positions: { north: 'a', east: 'b', south: 'c', west: 'd' },
    ready_players: ready,
    seats: Object.fromEntries(
      positions.map((position) => [
        position,
        {
          occupant_type: bots.includes(position) ? 'bot' : 'human',
          status: 'connected',
          user_id: bots.includes(position) ? null : position,
        },
      ])
    ) as ReadinessSnapshot['seats'],
  };
}

describe('rematchVote', () => {
  test('there is no vote before the game is over', () => {
    expect(rematchVote(null, 'north')).toBeNull();
    expect(rematchVote({ ...finished([]), status: 'playing' }, 'north')).toBeNull();
  });

  test('counts the humans who have asked', () => {
    expect(rematchVote(finished(['east', 'west']), 'north')).toEqual({
      needed: 4,
      agreed: 2,
      youAgreed: false,
    });
    expect(rematchVote(finished(['north']), 'north')?.youAgreed).toBe(true);
  });

  test('bots are ready on the server but are not part of the count', () => {
    const solo = finished(['east', 'south', 'west'], ['east', 'south', 'west']);
    expect(rematchVote(solo, 'north')).toEqual({ needed: 1, agreed: 0, youAgreed: false });
  });

  test('a spectator sees the count and has not agreed', () => {
    expect(rematchVote(finished(['north']), null)).toEqual({
      needed: 4,
      agreed: 1,
      youAgreed: false,
    });
  });
});
