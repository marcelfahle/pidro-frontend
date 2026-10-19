import type { BlockedPlayers, FriendLists, FriendResult, FriendNotice } from '@pidro/shared';

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
  if (
    !__DEV__ ||
    !['empty', 'list', 'added-you', 'loading', 'error', 'classic'].includes(value ?? '')
  )
    return;
  return {
    friends: ['empty', 'loading', 'error'].includes(value ?? '') ? [] : players.slice(0, 3),
    added_you: value === 'added-you' ? [players[3]] : [],
    ...(value === 'classic' ? { classic: { not_here: 7 } } : {}),
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

export function friendNoticeFixture(value?: string): FriendNotice[] | undefined {
  if (
    !__DEV__ ||
    !['friend-request', 'friend-accepted', 'friend-seat', 'friend-queue'].includes(value ?? '')
  )
    return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const request: FriendNotice = {
    kind: 'request',
    player: players[1],
    played_together_at: yesterday.toISOString(),
  };
  const accepted: FriendNotice = { kind: 'accepted', player: players[0], source: 'accept' };
  const seat: FriendNotice = {
    kind: 'seat',
    invitation: {
      code: 'NOTICE',
      position: 'north',
      host_id: 'kalle',
      host: players[3],
      rule_set: 'finnish',
    },
  };
  if (value === 'friend-queue') return [accepted, request, seat];
  return [value === 'friend-seat' ? seat : value === 'friend-accepted' ? accepted : request];
}
