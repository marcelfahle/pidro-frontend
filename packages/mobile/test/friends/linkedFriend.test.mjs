import { expect, mock, test } from 'bun:test';
import { useFriendsStore } from '@pidro/shared';

let lists;
mock.module('../../src/api/friends.ts', () => ({ friendsApi: { list: async () => lists } }));
mock.module('../../src/stores/auth.ts', () => ({ authStore: { subscribe: () => () => {} } }));
const { queueLinkedFriend } = await import('../../src/stores/friends.ts');

const bertil = { user_id: 'bertil', display_name: 'Bertil', avatar_url: null, presence: 'online' };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('a sign-up through a link says Request sent only while the request waits', async () => {
  lists = { friends: [], added_you: [], requested: [bertil] };
  queueLinkedFriend(bertil);
  await settle();
  expect(useFriendsStore.getState().notices).toEqual([{ kind: 'sent', player: bertil }]);

  // A Classic claim accepted Bertil's own request: they are friends, nothing was sent.
  useFriendsStore.getState().reset();
  lists = { friends: [bertil], added_you: [], requested: [] };
  queueLinkedFriend(bertil);
  await settle();
  expect(useFriendsStore.getState().notices).toEqual([]);
});
