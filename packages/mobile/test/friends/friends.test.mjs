import { afterEach, describe, expect, test } from 'bun:test';
import { localizedError, setLocale, useFriendsStore } from '@pidro/shared';
import {
  canSearch,
  canViewPlayer,
  classicFriendsMessage,
  friendAction,
  friendRowState,
  friendSections,
  friendsMeta,
  presenceLabel,
  relationLabel,
} from '../../src/features/friends/index.ts';

afterEach(() => {
  setLocale('en');
  useFriendsStore.getState().reset();
});

describe('Friends presentation', () => {
  test('Classic copy uses only a positive server count, with singular and plural wording', () => {
    const lists = { friends: [], added_you: [] };
    expect(classicFriendsMessage(lists)).toBeNull();
    expect(classicFriendsMessage({ ...lists, classic: { not_here: 0 } })).toBeNull();
    expect(classicFriendsMessage({ ...lists, classic: { not_here: 1 } })).toBe(
      "1 of your Classic friends isn't here yet"
    );
    expect(classicFriendsMessage({ ...lists, classic: { not_here: 7 } })).toBe(
      "7 of your Classic friends aren't here yet"
    );
    setLocale('sv');
    expect(classicFriendsMessage({ ...lists, classic: { not_here: 7 } })).toBe(
      '7 av dina Classic-vänner är inte här ännu'
    );
  });

  test('Classic metadata follows friend responses, survives block updates, and clears on reset', () => {
    const store = useFriendsStore.getState();
    const lists = { friends: [], added_you: [], classic: { not_here: 7 } };
    store.setLists(lists);
    store.setLists({ blocked: [] });
    expect(useFriendsStore.getState().classic).toEqual({ not_here: 7 });
    store.setLists({ ...lists, classic: { not_here: 0 } });
    expect(classicFriendsMessage(useFriendsStore.getState())).toBeNull();
    store.setLists(lists);
    store.setLists({ friends: [], added_you: [] });
    expect(useFriendsStore.getState().classic).toBeUndefined();
    store.setLists(lists);
    store.reset();
    expect(useFriendsStore.getState().classic).toBeUndefined();
  });

  test('human seats open profiles, but empty and bot seats do not', () => {
    for (const seatStatus of ['normal', 'reconnecting', 'bot_substitute']) {
      expect(canViewPlayer({ playerId: 'nora', seatStatus })).toBe(true);
      expect(canViewPlayer({ playerId: 'bot_ROOM_north', seatStatus })).toBe(false);
    }
    for (const seatStatus of ['vacant', 'permanent_bot']) {
      expect(canViewPlayer({ playerId: 'nora', seatStatus })).toBe(false);
    }
    expect(canViewPlayer({ playerId: null, seatStatus: 'normal' })).toBe(false);
  });

  test('requests, online, offline and sent keep their server order and omit empty sections', () => {
    const lists = {
      friends: [
        { user_id: 'z', display_name: 'Zoe', avatar_url: null, presence: 'at_table' },
        { user_id: 'a', display_name: 'Anna', avatar_url: null, presence: 'offline' },
      ],
      added_you: [{ user_id: 'n', display_name: 'Nora', avatar_url: null, presence: 'online' }],
      requested: [
        {
          user_id: 'e',
          display_name: 'Eero',
          presence: 'offline',
          requested_at: '2026-10-17T12:00:00Z',
        },
      ],
    };
    expect(
      friendSections(lists).map(({ key, players }) => [key, players.map((p) => p.user_id)])
    ).toEqual([
      ['requests', ['n']],
      ['online', ['z']],
      ['offline', ['a']],
      ['sent', ['e']],
    ]);
    expect(
      friendSections({ friends: lists.friends, added_you: [] }).map((section) => section.title)
    ).toEqual(['Online now', 'Not online']);
    expect(friendsMeta(lists)).toBe('2 friends · 1 online');
    expect(friendSections({ friends: [], added_you: [] })).toEqual([]);
    const cause = { error_code: 'profile_unavailable' };
    useFriendsStore.getState().setLists(lists);
    useFriendsStore.getState().setError(cause);
    for (const locale of ['sv', 'en']) {
      setLocale(locale);
      const sections = friendSections(useFriendsStore.getState());
      expect(sections.map((section) => section.title)).toEqual(
        locale === 'sv'
          ? ['Vill bli vänner', 'Online nu', 'Inte online', 'Väntar på svar']
          : ['Want to be friends', 'Online now', 'Not online', 'Waiting for an answer']
      );
      expect(sections[1].players[0].display_name).toBe('Zoe');
      expect(presenceLabel('at_table')).toBe(locale === 'sv' ? 'Vid ett bord' : 'At a table');
      expect(relationLabel('added_you')).toBe(locale === 'sv' ? 'Har lagt till dig' : 'Added you');
      expect(useFriendsStore.getState().error).toBe(cause);
      expect(localizedError(cause, 'friends.update_failed')).toBe(
        locale === 'sv'
          ? 'Din behörighet kunde inte kontrolleras. Försök igen om en stund.'
          : 'Your eligibility could not be checked. Please try again shortly.'
      );
    }
  });

  test('Join needs server permission; only free players and bot company offer Play', () => {
    for (const join_as of ['partner', 'opponent']) {
      expect(friendAction({ presence: 'at_table', table_company: 'people', join_as })).toBe('join');
      expect(friendAction({ presence: 'with_bots', join_as })).toBe('join');
    }
    for (const entry of [
      { presence: 'online' },
      { presence: 'with_bots' },
      { presence: 'at_table', table_company: 'bots' },
    ])
      expect(friendAction(entry)).toBe('play');
    for (const entry of [
      {},
      { presence: 'offline' },
      { presence: 'at_table', table_open_seats: 3 },
      { presence: 'with_others' },
      { presence: 'at_table', table_company: 'people', join_as: null },
    ])
      expect(friendAction(entry)).toBeNull();
  });

  test('wire dates, seats and hand feed the existing row formatter', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    expect(
      friendRowState(
        { presence: 'offline', played_together_at: '2026-10-18T12:00:00Z' },
        'friend',
        now
      ).line
    ).toBe('Played yesterday');
    expect(friendRowState({ requested_at: '2026-10-17T12:00:00Z' }, 'added', now).line).toBe(
      'Request sent 2 days ago'
    );
    expect(friendRowState({ requested_at: '2026-10-19T08:00:00Z' }, 'added_you', now).line).toBe(
      'Asked today'
    );
    expect(friendRowState({ presence: 'at_table', table_hand: 4 }).line).toBe(
      'At a table · hand 4'
    );
    expect(
      friendRowState({ presence: 'at_table', join_as: 'opponent', table_open_seats: 2 }).line
    ).toBe('At a table · 2 seats open');
  });

  test('sent requests and request count replace old lists and clear on reset', () => {
    const store = useFriendsStore.getState();
    const lists = {
      friends: [],
      added_you: [],
      requested: [{ user_id: 'sent' }],
      requests_waiting: 3,
    };
    store.setLists(lists);
    store.setLists({ blocked: [] });
    expect(useFriendsStore.getState().requested).toEqual(lists.requested);
    expect(useFriendsStore.getState().requests_waiting).toBe(3);
    store.setLists({ friends: [], added_you: [] });
    expect(useFriendsStore.getState().requested).toEqual([]);
    expect(useFriendsStore.getState().requests_waiting).toBe(0);
    store.setLists(lists);
    store.reset();
    expect(useFriendsStore.getState().requested).toEqual([]);
    expect(useFriendsStore.getState().requests_waiting).toBe(0);
    expect(localizedError({ error: 'NO_SEAT_FOR_YOU' })).toBe(
      'There is no seat available for you at this table.'
    );
  });

  test('labels distinguish all server states, including an unanswered outgoing add', () => {
    expect(['online', 'at_table', 'offline'].map((value) => presenceLabel(value))).toEqual([
      'Online',
      'At a table',
      'Offline',
    ]);
    expect(['none', 'friend', 'added_you', 'added'].map((value) => relationLabel(value))).toEqual([
      'Add',
      'Friend',
      'Added you',
      'Added',
    ]);
  });

  test('search waits for three normalized characters, excluding edge whitespace', () => {
    expect(canSearch(' no ')).toBe(false);
    expect(canSearch(' nor ')).toBe(true);
    expect(canSearch('a\u0308o')).toBe(false);
    expect(canSearch('a\u0308or')).toBe(true);
    expect(canSearch('😀a')).toBe(false);
    expect(canSearch('ﬃ')).toBe(true);
  });
});
