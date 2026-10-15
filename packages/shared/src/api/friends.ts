import type { ApiClient } from './client';

export interface FriendPlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  presence: 'online' | 'at_table' | 'offline';
}

export interface FriendLists {
  friends: FriendPlayer[];
  added_you: FriendPlayer[];
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
    search: async (query: string): Promise<FriendResult[]> =>
      (
        await api.get<{ data: { users: FriendResult[] } }>('/api/v1/users/search', {
          params: { q: query },
        })
      ).data.data.users,
    recent: async (): Promise<FriendResult[]> =>
      (await api.get<{ data: { users: FriendResult[] } }>('/api/v1/friends/recent')).data.data
        .users,
  };
}

export type FriendsApi = ReturnType<typeof createFriendsApi>;
