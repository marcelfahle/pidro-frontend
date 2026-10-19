import type { ApiClient } from './client';
import type { Room } from '../types/lobby';
import { normalizeRoom } from '../utils/rooms';

export interface FriendPlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  presence: 'online' | 'at_table' | 'offline';
  /** Who else is at their table, when they are at one (PID-251). */
  table_company?: 'bots' | 'people';
  /** Whether a seat at their table is open to you, and as what (PID-253). */
  join_as?: 'partner' | 'opponent' | null;
  requested_at?: string;
  table_open_seats?: number;
  table_hand?: number | null;
  played_together_at?: string | null;
}

export interface RequestedFriendPlayer extends FriendPlayer {
  requested_at: string;
}

export interface FriendLists {
  friends: FriendPlayer[];
  added_you: FriendPlayer[];
  requests_waiting?: number;
  waiting_for_you?: number;
  /** Requests you sent that have no answer yet, newest first (PID-245). */
  requested?: RequestedFriendPlayer[];
  requests_waiting?: number;
  classic?: { not_here: number };
}

export interface BlockedPlayers {
  blocked: Pick<FriendPlayer, 'user_id' | 'display_name' | 'avatar_url'>[];
}

export interface FriendResult extends FriendPlayer {
  relation: 'none' | 'friend' | 'added_you' | 'added';
}

export function createFriendsApi(api: ApiClient) {
  return {
    list: async (): Promise<FriendLists> =>
      (await api.get<{ data: FriendLists }>('/api/v1/friends')).data.data,
    add: async (id: string): Promise<FriendLists> =>
      (await api.put<{ data: FriendLists }>(`/api/v1/friends/${encodeURIComponent(id)}`)).data.data,
    remove: async (id: string): Promise<FriendLists> =>
      (await api.delete<{ data: FriendLists }>(`/api/v1/friends/${encodeURIComponent(id)}`)).data
        .data,
    ignore: async (id: string): Promise<FriendLists> =>
      (await api.post<{ data: FriendLists }>(`/api/v1/friends/${encodeURIComponent(id)}/ignore`)).data.data,
    unignore: async (id: string): Promise<FriendLists> =>
      (await api.delete<{ data: FriendLists }>(`/api/v1/friends/${encodeURIComponent(id)}/ignore`)).data.data,
    join: async (id: string) => {
      const { data } = await api.post<{ data: { room: Room; assigned_position: string } }>(`/api/v1/friends/${encodeURIComponent(id)}/join`);
      return { room: normalizeRoom(data.data.room), assigned_position: data.data.assigned_position };
    },
    search: async (query: string): Promise<FriendResult[]> =>
      (
        await api.get<{ data: { users: FriendResult[] } }>('/api/v1/users/search', {
          params: { q: query },
        })
      ).data.data.users,
    recent: async (): Promise<FriendResult[]> =>
      (await api.get<{ data: { users: FriendResult[] } }>('/api/v1/friends/recent')).data.data
        .users,
    blocks: async (): Promise<BlockedPlayers> =>
      (await api.get<{ data: BlockedPlayers }>('/api/v1/blocks')).data.data,
    block: async (id: string): Promise<BlockedPlayers> =>
      (await api.put<{ data: BlockedPlayers }>(`/api/v1/blocks/${encodeURIComponent(id)}`)).data
        .data,
    unblock: async (id: string): Promise<BlockedPlayers> =>
      (await api.delete<{ data: BlockedPlayers }>(`/api/v1/blocks/${encodeURIComponent(id)}`)).data
        .data,
  };
}

export type FriendsApi = ReturnType<typeof createFriendsApi>;
