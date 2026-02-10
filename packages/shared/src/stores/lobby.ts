import { create } from 'zustand';
import type { Room } from '../types/lobby';

interface LobbyStats {
  online_players: number;
  active_games: number;
}

interface LobbyState {
  rooms: Room[];
  stats: LobbyStats;
  isLoading: boolean;
  error: string | null;

  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  removeRoom: (roomIdOrCode: string) => void;
  setStats: (stats: Partial<LobbyStats>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  rooms: [],
  stats: {
    online_players: 0,
    active_games: 0,
  },
  isLoading: false,
  error: null,
};

export const useLobbyStore = create<LobbyState>((set) => ({
  ...initialState,

  setRooms: (rooms) => set({ rooms }),

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

  removeRoom: (idOrCode) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => {
        const matchesId = !!idOrCode && !!r.id && r.id === idOrCode;
        const matchesCode = r.code === idOrCode;
        return !(matchesId || matchesCode);
      }),
    })),

  setStats: (newStats) =>
    set((state) => ({
      stats: { ...state.stats, ...newStats },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
