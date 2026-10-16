import { describe, expect, it } from 'bun:test';
import { whosePidro } from '../../src/features/game/pidro.ts';

describe('whose Pidro it was', () => {
  it('is ours when we or our partner took it', () => {
    expect(whosePidro('south', 'south')).toEqual({ side: 'ours', column: 'us' });
    expect(whosePidro('north', 'south')).toEqual({ side: 'ours', column: 'us' });
    expect(whosePidro('west', 'east')).toEqual({ side: 'ours', column: 'us' });
  });

  it('is theirs when either opponent took it, whichever team we sit on', () => {
    expect(whosePidro('east', 'south')).toEqual({ side: 'theirs', column: 'them' });
    expect(whosePidro('west', 'north')).toEqual({ side: 'theirs', column: 'them' });
    expect(whosePidro('north', 'east')).toEqual({ side: 'theirs', column: 'them' });
  });

  it('takes no side for a spectator, landing in the winning team’s column', () => {
    expect(whosePidro('north', null)).toEqual({ side: 'neutral', column: 'us' });
    expect(whosePidro('east', null)).toEqual({ side: 'neutral', column: 'them' });
  });
});
