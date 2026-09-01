import { createLobbyApi } from '@pidro/shared';
import { api } from './client';

export type {
  ListRoomsResponse,
  GetRoomResponse,
  JoinRoomResponse,
  CreateRoomResponse,
} from '@pidro/shared';

export const lobbyApi = createLobbyApi(api);
