import type { FriendLists, SeatInvitation } from '@pidro/shared';

export function waitingCount(
  friends: Pick<FriendLists, 'requests_waiting' | 'added_you'>,
  invitations: readonly SeatInvitation[]
): number {
  return (friends.requests_waiting ?? friends.added_you.length) + invitations.length;
}
