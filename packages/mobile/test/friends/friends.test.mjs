import { afterEach, describe, expect, test } from 'bun:test';
import { localizedError, setLocale, useFriendsStore } from '@pidro/shared';
import {
  canSearch,
  friendSections,
  presenceLabel,
  relationLabel,
} from '../../src/features/friends/index.ts';

afterEach(() => {
  setLocale('en');
  useFriendsStore.getState().reset();
});

describe('Friends presentation', () => {
  test('Added you comes first; server player order and presence stay untouched', () => {
    const lists = {
      friends: [
        { user_id: 'z', display_name: 'Zoe', avatar_url: null, presence: 'at_table' },
        { user_id: 'a', display_name: 'Anna', avatar_url: null, presence: 'offline' },
      ],
      added_you: [{ user_id: 'n', display_name: 'Nora', avatar_url: null, presence: 'online' }],
    };
    expect(friendSections(lists)).toEqual([
      { title: 'Added you', players: lists.added_you, addBack: true },
      { title: 'Friends', players: lists.friends, addBack: false },
    ]);
    expect(
      friendSections({ friends: lists.friends, added_you: [] }).map((section) => section.title)
    ).toEqual(['Friends']);
    expect(friendSections({ friends: [], added_you: [] })).toEqual([]);
    const cause = { error_code: 'profile_unavailable' };
    useFriendsStore.getState().setLists(lists);
    useFriendsStore.getState().setError(cause);
    for (const locale of ['sv', 'en']) {
      setLocale(locale);
      const sections = friendSections(useFriendsStore.getState());
      expect(sections.map((section) => section.title)).toEqual(
        locale === 'sv' ? ['Har lagt till dig', 'Vänner'] : ['Added you', 'Friends']
      );
      expect(sections[1].players).toBe(lists.friends);
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
