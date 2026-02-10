import { createLobbyApi } from '@pidro/shared';
import { api } from './client';

export const lobbyApi = createLobbyApi(api);
