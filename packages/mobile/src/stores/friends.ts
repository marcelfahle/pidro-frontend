import { useFriendsStore, type FriendLists } from '@pidro/shared';
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

function updateLists(request: () => Promise<FriendLists>) {
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
