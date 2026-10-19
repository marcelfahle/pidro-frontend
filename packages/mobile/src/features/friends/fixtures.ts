import type { BlockedPlayers, FriendLists, FriendResult, FriendNotice } from '@pidro/shared';

export const FRIENDS_FIXTURE_NOW = new Date('2026-10-19T12:00:00Z');

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
    __DEV__ &&
    [
      'sheet-partner',
      'sheet-opponent',
      'sheet-full',
      'sheet-online',
      'sheet-bots',
      'sheet-offline',
      'sheet-request',
      'sheet-remove',
      'sheet-block',
    ].includes(value ?? '')
  ) {
    const presence =
      value === 'sheet-offline' ? 'offline' : value === 'sheet-online' ? 'online' : 'at_table';
    const player: FriendResult = {
      ...players[0],
      presence,
      table_company: value === 'sheet-bots' ? 'bots' : undefined,
      join_as:
        value === 'sheet-partner' ? 'partner' : value === 'sheet-opponent' ? 'opponent' : null,
    };
    return {
      friends: value === 'sheet-request' ? [] : [player],
      added_you: value === 'sheet-request' ? [player] : [],
    };
  }
  if (
    !__DEV__ ||
    !['empty', 'list', 'all', 'added-you', 'loading', 'error', 'classic'].includes(value ?? '')
  )
    return;
  if (value === 'all')
    return {
      friends: [
        { ...players[0], presence: 'at_table', join_as: 'partner', table_open_seats: 1 },
        { ...players[3], presence: 'at_table', table_company: 'people', table_hand: 4 },
        { ...players[0], user_id: 'maija', display_name: 'Maija' },
        {
          ...players[2],
          user_id: 'hanna',
          display_name: 'Hanna',
          played_together_at: '2026-10-18T12:00:00Z',
        },
      ],
      added_you: [{ ...players[1], requested_at: '2026-10-19T08:00:00Z' }],
      requests_waiting: 1,
      requested: [
        {
          ...players[3],
          user_id: 'eero',
          display_name: 'Eero',
          requested_at: '2026-10-17T12:00:00Z',
        },
      ],
      classic: { not_here: 38 },
    };
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
