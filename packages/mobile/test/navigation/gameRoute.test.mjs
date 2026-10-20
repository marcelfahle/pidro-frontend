import { describe, expect, it } from 'bun:test';
import { StackRouter } from 'expo-router/build/react-navigation/routers/StackRouter.js';
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

// Leaving a table is router.dismissTo(gameExitPath(origin)): POP_TO on the root stack.
describe('leaving a table', () => {
  const router = StackRouter({});
  const options = {
    routeNames: ['(shell)', 'lobby', 'new-table', 'game'],
    routeParamList: {},
    routeGetIdList: {},
  };
  // The first screen starts the stack; New table hands over to the game with a replace.
  const stack = (first, ...names) =>
    names.reduce(
      (state, name) =>
        router.getStateForAction(
          state,
          { type: state.routes.at(-1).name === 'new-table' ? 'REPLACE' : 'PUSH', payload: { name } },
          options
        ),
      router.getInitialState({ ...options, initialRouteName: first })
    );
  const leave = (state, name) =>
    router
      .getStateForAction(state, { type: 'POP_TO', payload: { name } }, options)
      .routes.map((route) => route.name);

  it('goes back to the Lobby it came from instead of stacking a second one', () => {
    expect(leave(stack('(shell)', 'lobby', 'new-table', 'game'), 'lobby')).toEqual([
      '(shell)',
      'lobby',
    ]);
  });

  it('goes back to Home from game over, past the Lobby', () => {
    expect(leave(stack('(shell)', 'lobby', 'game'), '(shell)')).toEqual(['(shell)']);
  });

  it('replaces the table with the Lobby when there is none underneath', () => {
    expect(leave(stack('(shell)', 'game'), 'lobby')).toEqual(['(shell)', 'lobby']);
    expect(leave(stack('game'), 'lobby')).toEqual(['lobby']);
  });
});
