import { createPendingFriendLinkStore, type FriendLinkRequest } from '@pidro/shared';
import { STORAGE_KEYS } from '@/constants/config';
import { friendLinkRequest } from '@/features/friends';
import { secureStorage } from '@/utils/storage';
import { authStore } from './auth';

export const usePendingFriendLinkStore = createPendingFriendLinkStore({
  storage: secureStorage,
  storageKey: STORAGE_KEYS.pendingFriendLink,
});

/** The link has done its work once the session is an account, friendship or not. */
function clearOnceRegistered() {
  const user = authStore.getState().user;
  const { pendingFriendLink, clearPendingFriendLink } = usePendingFriendLinkStore.getState();
  if (pendingFriendLink && user && !user.guest) clearPendingFriendLink();
}
authStore.subscribe(clearOnceRegistered);
usePendingFriendLinkStore.subscribe(clearOnceRegistered);
clearOnceRegistered();

/** Held only for someone without an account: a player who has one is already here. */
export function holdFriendLink(slug: string, displayName?: string | null) {
  const user = authStore.getState().user;
  if (user && !user.guest) return;
  usePendingFriendLinkStore.getState().setPendingFriendLink(slug, displayName);
}

export function pendingFriendSlug(): FriendLinkRequest {
  return friendLinkRequest(usePendingFriendLinkStore.getState().pendingFriendLink);
}
