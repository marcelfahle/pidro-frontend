import { describe, expect, it } from 'bun:test';
import { enqueueTableNotice } from '../../src/game/tableNotices.ts';

const notice = (message, variant = 'warning') => ({ message, variant });

describe('table notice queue', () => {
  it('coalesces only consecutive exact repeats', () => {
    const first = enqueueTableNotice([], notice('Disconnected'), 'ROOM');
    const duplicate = enqueueTableNotice(first, notice('Disconnected'), 'ROOM');
    const reconnected = enqueueTableNotice(duplicate, notice('Reconnected', 'success'), 'ROOM');
    const disconnectedAgain = enqueueTableNotice(reconnected, notice('Disconnected'), 'ROOM');

    expect(duplicate).toEqual(first);
    expect(disconnectedAgain.map(({ message }) => message)).toEqual([
      'Disconnected',
      'Reconnected',
      'Disconnected',
    ]);
  });

  it('keeps the current notice and the two newest pending notices', () => {
    const queued = ['A', 'B', 'C', 'D'].reduce(
      (current, message) => enqueueTableNotice(current, notice(message), 'ROOM'),
      []
    );

    expect(queued.map(({ message }) => message)).toEqual(['A', 'C', 'D']);
  });

  it('does not carry notices between rooms', () => {
    const oldRoom = enqueueTableNotice([], notice('Old room'), 'OLD');
    const newRoom = enqueueTableNotice(oldRoom, notice('New room', 'success'), 'NEW');

    expect(newRoom).toEqual([{ message: 'New room', variant: 'success', roomCode: 'NEW' }]);
  });
});
