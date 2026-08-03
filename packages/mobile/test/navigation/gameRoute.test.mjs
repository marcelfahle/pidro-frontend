import { describe, expect, it } from 'bun:test';
import { gameExitPath, gameRoute } from '../../src/navigation/gameRoute.ts';

describe('game navigation', () => {
  it('returns a single-player game to Home', () => {
    expect(gameExitPath('single-player')).toBe('/home');
  });

  it('returns a multiplayer game to the lobby', () => {
    expect(gameExitPath(undefined)).toBe('/lobby');
  });

  it('preserves the single-player origin when starting another game', () => {
    expect(gameRoute('ABCD', 'single-player')).toEqual({
      pathname: '/game/[code]',
      params: { code: 'ABCD', origin: 'single-player' },
    });
  });
});
