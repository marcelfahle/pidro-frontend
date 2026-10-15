import type { BlockedPlayers, FriendLists, FriendResult } from '@pidro/shared';

const players: FriendResult[] = [
  { user_id: 'nora', display_name: 'Nora', avatar_url: null, presence: 'online', relation: 'none' },
  {
    user_id: 'pekka',
    display_name: 'Pekka',
    avatar_url: null,
    presence: 'at_table',
    relation: 'friend',
  },
  {
    user_id: 'liisa',
    display_name: 'Liisa',
    avatar_url: null,
    presence: 'offline',
    relation: 'added_you',
  },
  {
    user_id: 'kalle',
    display_name: 'Kalle',
    avatar_url: null,
    presence: 'offline',
    relation: 'added',
  },
];

export function friendsFixture(value?: string): FriendLists | undefined {
  if (!__DEV__ || !['empty', 'list', 'added-you', 'loading', 'error'].includes(value ?? '')) return;
  return {
    friends: ['empty', 'loading', 'error'].includes(value ?? '') ? [] : players.slice(0, 3),
    added_you: value === 'added-you' ? [players[3]] : [],
  };
}

export function discoveryFixture(value?: string): FriendResult[] | undefined {
  if (!__DEV__ || !['recent', 'results'].includes(value ?? '')) return;
  return value === 'recent'
    ? [players[0], players[3]]
    : players.map((player, index) => ({
        ...player,
        display_name: ['Nora', 'Norbert', 'Noreen', 'Norman'][index],
      }));
}

export function blockedFixture(value?: string): BlockedPlayers | undefined {
  if (!__DEV__ || !['empty', 'filled', 'loading', 'error'].includes(value ?? '')) return;
  return {
    blocked:
      value === 'filled'
        ? players.slice(0, 2).map(({ user_id, display_name, avatar_url }) => ({
            user_id,
            display_name,
            avatar_url,
          }))
        : [],
  };
}
