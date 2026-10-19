import {
  isFriendAccepted,
  useFriendsStore,
  type BlockedPlayers,
  type FriendLists,
  type FriendPlayer,
} from '@pidro/shared';
import { friendsApi } from '@/api/friends';
import { authStore } from './auth';

export { useFriendsStore };

let revision = 0;
let requests: Promise<unknown> = Promise.resolve();
authStore.subscribe((state, previous) => {
  if (state.accessToken !== previous.accessToken) {
    revision++;
    requests = Promise.resolve();
    useFriendsStore.getState().reset();
  }
});

function updateLists<T extends FriendLists | BlockedPlayers>(request: () => Promise<T>) {
  const current = revision;
  // A mutation's full answer lands before its friends_changed refetch.
  const result = requests.then(async () => {
    if (current !== revision) return;
    const store = useFriendsStore.getState();
    store.setError(null);
    store.setLoading(true);
    try {
      const lists = await request();
      if (current === revision) store.setLists(lists);
      return lists;
    } catch (error) {
      if (current === revision) store.setError(error ?? true);
      throw error;
    }
  });
  requests = result.catch(() => undefined);
  return result;
}

export const refreshFriends = () => updateLists(friendsApi.list);
export const addFriend = (id: string) => updateLists(() => friendsApi.add(id));
export const removeFriend = (id: string) => updateLists(() => friendsApi.remove(id));
export const ignoreFriend = (id: string) => updateLists(() => friendsApi.ignore(id));
export const unignoreFriend = (id: string) => updateLists(() => friendsApi.unignore(id));

export const refreshBlockedPlayers = () => updateLists(friendsApi.blocks);
export const unblockPlayer = (id: string) => updateLists(() => friendsApi.unblock(id));
export async function blockPlayer(id: string) {
  await updateLists(() => friendsApi.block(id));
  void refreshFriends().catch(() => undefined);
}

/** A sign-up through someone's link sends them a friend request: "Request sent. You'll be friends once Bertil accepts." */
export function queueLinkedFriend(friend: FriendPlayer | undefined) {
  const accepted = { player: friend, source: 'link' };
  if (isFriendAccepted(accepted))
    useFriendsStore.getState().queueNotice({ ...accepted, kind: 'accepted' });
}
