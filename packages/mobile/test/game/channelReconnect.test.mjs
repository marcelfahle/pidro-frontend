import { describe, expect, it } from 'bun:test';
import { reconnectsAfterClose } from '../../src/features/game/channelReconnect';

describe('game channel reconnect after close', () => {
  it('rejoins a dropped channel while a screen shows the table', () => {
    expect(reconnectsAfterClose(false, 1)).toBe(true);
  });

  it('stays away after the server removed the player for missed turns', () => {
    expect(reconnectsAfterClose(true, 1)).toBe(false);
  });

  it('does not rejoin once no screen needs the channel', () => {
    expect(reconnectsAfterClose(false, 0)).toBe(false);
  });
});
