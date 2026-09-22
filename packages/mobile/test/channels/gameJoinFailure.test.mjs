import { describe, expect, it } from 'bun:test';
import { terminalGameJoinFailure } from '../../src/channels/gameJoinFailure.ts';

describe('terminal game join failures', () => {
  it('classifies expired and permanent seats as terminal', () => {
    expect(terminalGameJoinFailure('reconnection grace period expired')).toBe('seat_unavailable');
    expect(terminalGameJoinFailure('Seat permanently filled by bot')).toBe('seat_unavailable');
  });

  it('classifies unavailable rooms and authorization failures', () => {
    expect(terminalGameJoinFailure('room not found')).toBe('room_unavailable');
    expect(terminalGameJoinFailure('not authorized to join this room')).toBe('access_unavailable');
  });

  it('keeps transport and unknown failures retryable', () => {
    expect(terminalGameJoinFailure('timeout')).toBeNull();
    expect(terminalGameJoinFailure('Unable to join game room.')).toBeNull();
    expect(terminalGameJoinFailure(null)).toBeNull();
  });
});
