import { create } from 'zustand';
import type { LobbyCategories, LobbyCategoryKey, Room } from '../types/lobby';
import {
  emptyLobbyCategories,
  flattenLobbyCategories,
  lobbyCategoryKeys,
} from '../utils/rooms';

interface LobbyStats {
  online_players: number;
  active_games: number;
}

interface LobbyState {
  rooms: Room[];
  lobby: LobbyCategories;
  stats: LobbyStats;
  isLoading: boolean;
  error: string | null;

  setRooms: (rooms: Room[]) => void;
  setLobby: (lobby: LobbyCategories) => void;
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  upsertLobbyRoom: (room: Room, category?: LobbyCategoryKey | string | null) => void;
  removeRoom: (roomIdOrCode: string) => void;
  setStats: (stats: Partial<LobbyStats>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  rooms: [],
  lobby: emptyLobbyCategories(),
  stats: {
    online_players: 0,
    active_games: 0,
  },
  isLoading: false,
  error: null,
};

export const useLobbyStore = create<LobbyState>((set) => ({
  ...initialState,

  setRooms: (rooms) =>
    set({
      rooms,
      lobby: {
        ...emptyLobbyCategories(),
        open_tables: rooms,
      },
    }),

  setLobby: (lobby) => set({ lobby, rooms: flattenLobbyCategories(lobby) }),

  addRoom: (room) =>
    set((state) => ({
      rooms: [...state.rooms, room],
    })),

  updateRoom: (updatedRoom) =>
    set((state) => ({
      rooms: state.rooms.map((r) => {
        const idsMatch = !!r.id && !!updatedRoom.id && r.id === updatedRoom.id;
        const codesMatch = r.code === updatedRoom.code;
        return idsMatch || codesMatch ? updatedRoom : r;
      }),
    })),

  upsertLobbyRoom: (updatedRoom, category) =>
    set((state) => {
      const lobby = emptyLobbyCategories();
      lobbyCategoryKeys.forEach((key) => {
        lobby[key] = state.lobby[key].filter((room) => room.code !== updatedRoom.code);
      });

      if (category && lobbyCategoryKeys.includes(category as LobbyCategoryKey)) {
        const key = category as LobbyCategoryKey;
        lobby[key] = [updatedRoom, ...lobby[key]];
      }

      const nextRooms = flattenLobbyCategories(lobby);
      if (!nextRooms.some((room) => room.code === updatedRoom.code) && !category) {
        return {
          lobby,
          rooms: state.rooms.map((room) =>
            room.code === updatedRoom.code ? updatedRoom : room,
          ),
        };
      }

      return { lobby, rooms: nextRooms };
    }),

  removeRoom: (idOrCode) =>
    set((state) => {
      const lobby = emptyLobbyCategories();
      lobbyCategoryKeys.forEach((key) => {
        lobby[key] = state.lobby[key].filter((room) => {
          const matchesId = !!idOrCode && !!room.id && room.id === idOrCode;
          const matchesCode = room.code === idOrCode;
          return !(matchesId || matchesCode);
        });
      });

      return {
        lobby,
        rooms: state.rooms.filter((r) => {
          const matchesId = !!idOrCode && !!r.id && r.id === idOrCode;
          const matchesCode = r.code === idOrCode;
          return !(matchesId || matchesCode);
        }),
      };
    }),

  setStats: (newStats) =>
    set((state) => ({
      stats: { ...state.stats, ...newStats },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
