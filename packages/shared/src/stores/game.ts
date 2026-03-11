import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import type {
  ActiveTurnTimer,
  ServerGameState,
  PlayerMeta,
  GameViewModel,
  RelativePlayerView,
  LegalAction,
  Suit,
  SeatStatus,
} from '../types/game';
import type { Position, Room } from '../types/lobby';
import { mapAbsoluteToRelative, isTeammate, POSITION_TO_INDEX } from '../utils/positions';
import { buildPositionsFromSeats } from '../utils/rooms';

const POSITIONS: Position[] = ['north', 'east', 'south', 'west'];

function createEmptyPlayerMeta(position: Position): PlayerMeta {
  return {
    position,
    playerId: null,
    username: null,
    isYou: false,
    isTeammate: false,
    isOpponent: false,
    isConnected: false,
    seatStatus: 'normal',
  };
}

interface GameState {
  roomCode: string | null;
  youPlayerId: string | null;
  youPositionAbs: Position | null;
  role: 'player' | 'spectator' | null;

  serverState: ServerGameState | null;
  legalActions: LegalAction[];
  playerMeta: Record<Position, PlayerMeta>;
  readyPlayers: Position[];
  turnTimer: ActiveTurnTimer | null;

  isChannelJoined: boolean;
  isRejoining: boolean;
  lastError: string | null;

  initFromRoom: (params: { room: Room; youPlayerId: string }) => void;
  setServerState: (state: ServerGameState | Record<string, any>) => void;
  setLegalActions: (actions: LegalAction[]) => void;
  setTurnTimer: (timer: ActiveTurnTimer | null) => void;
  clearTurnTimer: (timerId?: number | null) => void;
  setYouPosition: (position: Position) => void;
  setRole: (role: 'player' | 'spectator' | null) => void;
  updateCurrentTurn: (position: Position | null) => void;
  setPlayerConnected: (
    playerId: string | null,
    position: Position | null,
    connected: boolean,
  ) => void;
  setSeatStatus: (position: Position, status: SeatStatus, username?: string | null) => void;
  addReadyPlayer: (position: Position) => void;
  setChannelStatus: (joined: boolean, rejoining?: boolean) => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

const initialPlayerMeta: Record<Position, PlayerMeta> = {
  north: createEmptyPlayerMeta('north'),
  east: createEmptyPlayerMeta('east'),
  south: createEmptyPlayerMeta('south'),
  west: createEmptyPlayerMeta('west'),
};

export const useGameStore = create<GameState>((set, get) => ({
  roomCode: null,
  youPlayerId: null,
  youPositionAbs: null,
  role: null,
  serverState: null,
  legalActions: [],
  playerMeta: { ...initialPlayerMeta },
  readyPlayers: [],
  turnTimer: null,
  isChannelJoined: false,
  isRejoining: false,
  lastError: null,

  initFromRoom: ({ room, youPlayerId }) => {
    let youPos: Position | null = null;

    const positions = room.positions ?? buildPositionsFromSeats(room.seats);
    POSITIONS.forEach((pos) => {
      if (positions?.[pos] === youPlayerId) youPos = pos;
    });

    const baseMeta: Record<Position, PlayerMeta> = {
      north: createEmptyPlayerMeta('north'),
      east: createEmptyPlayerMeta('east'),
      south: createEmptyPlayerMeta('south'),
      west: createEmptyPlayerMeta('west'),
    };

    POSITIONS.forEach((pos) => {
      const playerId = positions?.[pos] ?? null;
      const seat = room.seats?.find(
        (s) =>
          s.player?.id === playerId ||
          s.position === pos ||
          s.seat_index === POSITION_TO_INDEX[pos],
      );
      baseMeta[pos] = {
        position: pos,
        playerId,
        username: seat?.player?.username ?? null,
        isYou: playerId === youPlayerId,
        isTeammate: false,
        isOpponent: false,
        isConnected: true,
        seatStatus: seat?.player?.is_bot ? 'bot_substitute' : 'normal',
      };
    });

    if (youPos) {
      POSITIONS.forEach((pos) => {
        const teammate = isTeammate(youPos!, pos);
        baseMeta[pos].isTeammate = teammate && !baseMeta[pos].isYou;
        baseMeta[pos].isOpponent = !teammate && !baseMeta[pos].isYou;
      });
    }

    set({
      roomCode: room.code,
      youPlayerId,
      youPositionAbs: youPos,
      playerMeta: baseMeta,
    });
  },

  setServerState: (state) =>
    set(() => {
      const raw = state as Record<string, any>;

      const currentPlayer = raw.current_player ?? (raw.current_turn as Position | null | undefined);
      const trump = raw.trump ?? raw.trump_suit ?? null;
      const dealer = raw.dealer ?? (raw.current_dealer as Position | null | undefined);

      const bidsRaw = raw.bids;
      let bids: Record<Position, number | 'pass'> | undefined;
      if (Array.isArray(bidsRaw)) {
        bids = bidsRaw.reduce(
          (acc, entry) => {
            const pos: Position | undefined = entry?.position ?? entry?.pos ?? entry?.[0];
            const amount: number | 'pass' | undefined =
              entry?.amount ?? entry?.bid ?? entry?.[1] ?? entry?.value;
            if (pos) acc[pos] = amount ?? acc[pos] ?? 'pass';
            return acc;
          },
          {} as Record<Position, number | 'pass'>,
        );
      } else if (bidsRaw && typeof bidsRaw === 'object') {
        bids = bidsRaw as Record<Position, number | 'pass'>;
      }

      const highestBidAmount =
        raw.current_bid ?? raw.highest_bid?.amount ?? (raw.highest_bid as number | undefined);

      const bidWinner: Position | null | undefined =
        raw.bid_winner ?? raw.highest_bid?.position ?? null;

      const phase = (raw.phase as ServerGameState['phase'] | undefined) ?? null;
      const isTerminalPhase = phase === 'complete' || phase === 'game_over';

      return {
        serverState: {
          ...(raw as ServerGameState),
          current_player: currentPlayer ?? null,
          trump,
          dealer: dealer ?? null,
          bids: bids ?? undefined,
          current_bid: highestBidAmount ?? null,
          bid_winner: bidWinner,
          highest_bid: raw.highest_bid,
        },
        ...(isTerminalPhase ? { turnTimer: null } : {}),
      };
    }),

  setYouPosition: (position) => {
    const curr = get();
    if (curr.youPositionAbs === position) return;

    const updated = { ...curr.playerMeta };
    POSITIONS.forEach((pos) => {
      const isYou = pos === position;
      const teammate = isTeammate(position, pos);
      updated[pos] = {
        ...updated[pos],
        isYou,
        isTeammate: teammate && !isYou,
        isOpponent: !teammate && !isYou,
      };
    });
    set({ youPositionAbs: position, playerMeta: updated });
  },

  setRole: (role) => set({ role }),

  setLegalActions: (actions) => set({ legalActions: actions }),

  setTurnTimer: (timer) => set({ turnTimer: timer }),

  clearTurnTimer: (timerId) =>
    set((curr) => {
      if (timerId != null && curr.turnTimer?.timerId !== timerId) {
        return {};
      }

      return { turnTimer: null };
    }),

  updateCurrentTurn: (position) =>
    set((curr) => ({
      serverState: curr.serverState ? { ...curr.serverState, current_player: position } : null,
    })),

  setPlayerConnected: (playerId, position, connected) =>
    set((curr) => {
      const updated = { ...curr.playerMeta };
      POSITIONS.forEach((pos) => {
        if (updated[pos].playerId === playerId || pos === position) {
          updated[pos] = { ...updated[pos], isConnected: connected };
        }
      });
      return { playerMeta: updated };
    }),

  setSeatStatus: (position, status, username) =>
    set((curr) => {
      const updated = { ...curr.playerMeta };
      updated[position] = {
        ...updated[position],
        seatStatus: status,
        ...(username !== undefined ? { username } : {}),
      };
      return { playerMeta: updated };
    }),

  addReadyPlayer: (position) =>
    set((curr) => ({
      readyPlayers: curr.readyPlayers.includes(position)
        ? curr.readyPlayers
        : [...curr.readyPlayers, position],
    })),

  setChannelStatus: (joined, rejoining = false) =>
    set({ isChannelJoined: joined, isRejoining: rejoining }),

  setError: (err) => set({ lastError: err }),

  reset: () =>
    set({
      roomCode: null,
      youPlayerId: null,
      youPositionAbs: null,
      role: null,
      serverState: null,
      legalActions: [],
      turnTimer: null,
      playerMeta: {
        north: createEmptyPlayerMeta('north'),
        east: createEmptyPlayerMeta('east'),
        south: createEmptyPlayerMeta('south'),
        west: createEmptyPlayerMeta('west'),
      },
      readyPlayers: [],
      isChannelJoined: false,
      isRejoining: false,
      lastError: null,
    }),
}));

export function useGameViewModel(): GameViewModel | null {
  const { serverState, playerMeta, youPositionAbs, roomCode } = useGameStore(
    useShallow((state) => ({
      serverState: state.serverState,
      playerMeta: state.playerMeta,
      youPositionAbs: state.youPositionAbs,
      roomCode: state.roomCode,
    })),
  );

  return useMemo(() => {
    if (!serverState || !roomCode) {
      return null;
    }

    const viewerPositionAbs = youPositionAbs ?? 'south';

    const rawState = serverState as unknown as Record<string, unknown>;
    const currentPlayer =
      serverState.current_player ?? (rawState.current_turn as Position | null | undefined) ?? null;
    const trumpSuit = serverState.trump ?? (rawState.trump_suit as Suit | null) ?? null;
    const dealerPosition =
      serverState.dealer ?? (rawState.current_dealer as Position | null | undefined) ?? null;
    const { phase } = serverState;

    const players: RelativePlayerView[] = POSITIONS.map((absPos) => {
      const meta = playerMeta[absPos];
      const relPos = mapAbsoluteToRelative(absPos, viewerPositionAbs);
      const isCurrentTurn = currentPlayer === absPos;

      return {
        absolutePosition: absPos,
        relativePosition: relPos,
        playerId: meta.playerId,
        username: meta.username,
        isYou: meta.isYou,
        isTeammate: meta.isTeammate,
        isOpponent: meta.isOpponent,
        isConnected: meta.isConnected,
        isCurrentTurn,
        seatStatus: meta.seatStatus,
      };
    });

    return {
      roomCode,
      phase,
      viewerPositionAbsolute: viewerPositionAbs,
      trumpSuit,
      dealerAbsolute: dealerPosition ?? null,
      dealerRelative: dealerPosition
        ? mapAbsoluteToRelative(dealerPosition, viewerPositionAbs)
        : null,
      currentTurnAbsolute: currentPlayer ?? null,
      currentTurnRelative: currentPlayer
        ? mapAbsoluteToRelative(currentPlayer, viewerPositionAbs)
        : null,
      players,
    };
  }, [serverState, playerMeta, youPositionAbs, roomCode]);
}
