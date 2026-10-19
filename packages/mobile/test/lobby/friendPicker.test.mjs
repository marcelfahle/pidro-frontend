import { expect, test } from 'bun:test';
import { groupPickerFriends } from '../../src/features/lobby/friendPicker.ts';

test('groups by caller section in display order, preserving availability and order within each group', () => {
  const friends = [
    { id: 'busy', name: 'Hanna', section: 'busy', availability: 'others' },
    { id: 'offline', name: 'Maija', section: 'offline', availability: 'selected' },
    { id: 'online', name: 'Pekka', section: 'online', availability: 'taken' },
    { id: 'bots', name: 'Eli', section: 'online', availability: 'bots' },
  ];
  expect(groupPickerFriends(friends, '')).toEqual([
    { section: 'online', friends: [friends[2], friends[3]] },
    { section: 'offline', friends: [friends[1]] },
    { section: 'busy', friends: [friends[0]] },
  ]);
  expect(friends.map((friend) => friend.id)).toEqual(['busy', 'offline', 'online', 'bots']);
});

test('normalizes and trims a name query, keeps unavailable matches, and omits empty sections', () => {
  const friends = [
    { id: '1', name: 'Ｍaija', section: 'offline', availability: 'taken' },
    { id: '2', name: 'Pekka', section: 'online', availability: 'online' },
    { id: '3', name: 'Maija-Liisa', section: 'busy', availability: 'others' },
  ];
  expect(groupPickerFriends(friends, '  MAIJA ')).toEqual([
    { section: 'offline', friends: [friends[0]] },
    { section: 'busy', friends: [friends[2]] },
  ]);
  expect(groupPickerFriends(friends, 'nobody')).toEqual([]);
  expect(groupPickerFriends([], '')).toEqual([]);
});
