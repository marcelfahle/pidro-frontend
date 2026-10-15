import { describe, expect, test } from 'bun:test';
import {
  canSearch,
  friendSections,
  presenceLabel,
  relationLabel,
} from '../../src/features/friends/index.ts';

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
