import { PhoenixSocket, useGameStore, useGameViewModel, useLobbyStore } from '@pidro/shared';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const emptyLobby = {
  my_rejoinable: [],
  open_tables: [],
  substitute_needed: [],
  spectatable: [],
};

beforeEach(() => {
  useGameStore.getState().reset();
  useLobbyStore.getState().reset();
});

afterEach(cleanup);

describe('shared store regressions', () => {
  it('keeps the JWT out of the WebSocket URL', () => {
    const socket = new PhoenixSocket().init({
      config: {
        baseURL: 'https://app.pidro.online',
        wsURL: 'wss://app.pidro.online/socket',
        timeout: 10_000,
      },
      getToken: () => 'secret.jwt.token',
    });

    expect(socket.endPointURL()).not.toContain('secret.jwt.token');
    expect(socket.endPointURL()).not.toContain('token=');
  });

  it('preserves flat-only rooms when a categorized room is upserted', () => {
    const flatRoom = { code: 'FLAT', status: 'waiting' as const };
    const categorizedRoom = { code: 'MINE', status: 'playing' as const };

    act(() => {
      useLobbyStore.getState().setLobby(emptyLobby);
      useLobbyStore.getState().addRoom(flatRoom);
      useLobbyStore.getState().upsertLobbyRoom(categorizedRoom, 'my_rejoinable');
    });

    expect(useLobbyStore.getState().rooms.map((room) => room.code)).toEqual(['MINE', 'FLAT']);
  });

  it('keeps live seat state when a sparse room refresh arrives', () => {
    act(() => {
      useGameStore.getState().initFromRoom({
        room: {
          code: 'ROOM',
          status: 'playing',
          positions: {
            north: 'me',
            east: 'east',
            south: 'south',
            west: 'west',
          },
        },
        youPlayerId: 'me',
      });
      useGameStore.getState().setSeatStatus('east', 'reconnecting', 'Casey');
      useGameStore.getState().initFromRoom({
        room: { code: 'ROOM', status: 'playing', seats: [] },
        youPlayerId: 'me',
      });
    });

    const state = useGameStore.getState();
    expect(state.youPositionAbs).toBe('north');
    expect(state.playerMeta.east).toMatchObject({
      playerId: 'east',
      username: 'Casey',
      seatStatus: 'reconnecting',
    });
  });

  it('renders a real username that matches a position name', () => {
    act(() => {
      useGameStore.getState().initFromRoom({
        room: {
          code: 'ROOM',
          status: 'playing',
          positions: { north: 'north-id', east: null, south: 'me', west: null },
          seats: [
            {
              seat_index: 0,
              position: 'north',
              status: 'occupied',
              player: { id: 'north-id', username: 'north' },
            },
          ],
        },
        youPlayerId: 'me',
      });
      useGameStore.getState().setServerState({
        phase: 'playing',
        current_player: 'south',
        players: { north: {}, east: {}, south: {}, west: {} },
      });
    });

    const { result } = renderHook(() => useGameViewModel());
    expect(
      result.current?.players.find((player) => player.absolutePosition === 'north')?.username,
    ).toBe('north');
  });
});
