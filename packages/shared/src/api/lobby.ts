import type { ApiClient } from './client';
import type {
  LobbyCategories,
  Room,
  CreateRoomRequest,
  PositionPreference,
} from '../types/lobby';
import {
  flattenLobbyCategories,
  normalizeLobbyCategories,
  normalizeRoom,
  normalizeRooms,
} from '../utils/rooms';

export interface ListRoomsResponse {
  data?: {
    rooms: Room[];
    meta?: {
      total_rooms: number;
      online_players: number;
      active_games: number;
    };
  };
  rooms?: Room[];
  meta?: {
    total_rooms: number;
    online_players: number;
    active_games: number;
  };
}

export interface ListLobbyResponse {
  data?: Partial<LobbyCategories>;
  lobby?: Partial<LobbyCategories>;
}

export interface GetRoomResponse {
  data?: { room: Room };
  room?: Room;
}

export interface JoinRoomResponse {
  data?: { room: Room; assigned_position: string };
  room?: Room;
  assigned_position?: string;
}

export interface CreateRoomResponse {
  data?: { code: string; room: Room };
  code?: string;
  room?: Room;
}

function extractRoomsFromResponse(body: any): Room[] {
  const candidates = [body?.data?.rooms, body?.rooms, body?.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

export function createLobbyApi(api: ApiClient) {
  return {
    listRooms: async (): Promise<{ rooms: Room[]; meta?: ListRoomsResponse['meta'] }> => {
      const response = await api.get<any>('/api/v1/rooms');
      const body = response.data;
      const rooms = normalizeRooms(extractRoomsFromResponse(body));
      const meta = body?.meta ?? body?.data?.meta;
      return { rooms, meta };
    },

    listLobby: async (): Promise<{ lobby: LobbyCategories; rooms: Room[] }> => {
      const response = await api.get<ListLobbyResponse>('/api/v1/lobby');
      const body = response.data;
      const rawLobby = body?.data ?? body?.lobby ?? body;
      const lobby = normalizeLobbyCategories(rawLobby);
      return {
        lobby,
        rooms: flattenLobbyCategories(lobby),
      };
    },

    getRoom: async (code: string): Promise<Room> => {
      const response = await api.get<GetRoomResponse>(`/api/v1/rooms/${code}`);
      const payload = response.data;
      const rawRoom = payload?.data?.room ?? payload?.room ?? payload;
      return normalizeRoom(rawRoom);
    },

    createRoom: async (payload: CreateRoomRequest): Promise<CreateRoomResponse['data']> => {
      const response = await api.post<CreateRoomResponse>('/api/v1/rooms', payload);
      const data = response.data?.data ?? response.data;
      const room = data?.room ? normalizeRoom(data.room) : normalizeRoom(data);
      return { code: data?.code ?? room.code, room };
    },

    joinRoom: async (
      code: string,
      position?: PositionPreference,
    ): Promise<{ room: Room; assigned_position: string }> => {
      const body = position ? { position } : undefined;
      const response = await api.post<JoinRoomResponse>(`/api/v1/rooms/${code}/join`, body);
      return {
        room: normalizeRoom(response.data?.data?.room ?? response.data?.room),
        assigned_position:
          response.data?.data?.assigned_position ?? response.data?.assigned_position ?? '',
      };
    },

    watchRoom: async (code: string): Promise<Room> => {
      const response = await api.post<GetRoomResponse>(`/api/v1/rooms/${code}/watch`);
      const payload = response.data;
      const rawRoom = payload?.data?.room ?? payload?.room ?? payload;
      return normalizeRoom(rawRoom);
    },

    leaveRoom: async (code: string): Promise<void> => {
      await api.delete(`/api/v1/rooms/${code}/leave`);
    },

    unwatchRoom: async (code: string): Promise<void> => {
      await api.delete(`/api/v1/rooms/${code}/unwatch`);
    },
  };
}

export type LobbyApi = ReturnType<typeof createLobbyApi>;
