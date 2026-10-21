import type { FriendLists, SeatInvitation } from '@pidro/shared';

export function waitingCount(
  friends: Pick<FriendLists, 'waiting_for_you' | 'requests_waiting' | 'added_you'>,
  invitations: readonly SeatInvitation[]
): number {
  return (
    friends.waiting_for_you ??
    (friends.requests_waiting ?? friends.added_you.length) + invitations.length
  );
}
