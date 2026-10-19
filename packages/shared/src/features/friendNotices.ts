import type { FriendLists, FriendPlayer } from '../api/friends';
import type { SeatInvitation } from '../types/lobby';

export type FriendNotice =
  | { kind: 'request'; player: FriendPlayer; played_together_at: string | null }
  | { kind: 'accepted'; player: FriendPlayer; source: 'accept' | 'link' }
  | { kind: 'seat'; invitation: SeatInvitation };

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function player(value: unknown): value is FriendPlayer {
  return (
    object(value) &&
    typeof value.user_id === 'string' &&
    value.user_id.length > 0 &&
    typeof value.display_name === 'string' &&
    (value.avatar_url === null || typeof value.avatar_url === 'string') &&
    typeof value.presence === 'string' &&
    ['online', 'at_table', 'offline'].includes(value.presence)
  );
}

export function isFriendRequest(
  value: unknown
): value is Omit<Extract<FriendNotice, { kind: 'request' }>, 'kind'> {
  return (
    object(value) &&
    player(value.player) &&
    (value.played_together_at === null ||
      (typeof value.played_together_at === 'string' &&
        Number.isFinite(Date.parse(value.played_together_at))))
  );
}

export function isFriendAccepted(
  value: unknown
): value is Omit<Extract<FriendNotice, { kind: 'accepted' }>, 'kind'> {
  return (
    object(value) && player(value.player) && (value.source === 'accept' || value.source === 'link')
  );
}

export function isSeatInvitationGone(
  value: unknown
): value is Pick<SeatInvitation, 'code' | 'position'> {
  return (
    object(value) &&
    typeof value.code === 'string' &&
    value.code.length > 0 &&
    typeof value.position === 'string' &&
    ['north', 'east', 'south', 'west'].includes(value.position)
  );
}

export function isSeatInvitation(value: unknown): value is SeatInvitation {
  return (
    object(value) &&
    typeof value.host_id === 'string' &&
    value.host_id.length > 0 &&
    (value.host === undefined ||
      (object(value.host) &&
        typeof value.host.user_id === 'string' &&
        typeof value.host.display_name === 'string' &&
        (value.host.avatar_url === null || typeof value.host.avatar_url === 'string'))) &&
    (value.rule_set === undefined ||
      value.rule_set === 'finnish' ||
      value.rule_set === 'louisiana') &&
    (value.held_since === undefined || typeof value.held_since === 'string') &&
    isSeatInvitationGone(value)
  );
}

export function friendNoticeId(notice: FriendNotice): string {
  return notice.kind === 'seat'
    ? `seat:${notice.invitation.code}:${notice.invitation.position}:${notice.invitation.held_since ?? ''}`
    : `${notice.kind}:${notice.player.user_id}`;
}

export function enqueueFriendNotice(queue: FriendNotice[], seen: string[], notice: FriendNotice) {
  const id = friendNoticeId(notice);
  if (seen.includes(id)) return { notices: queue, seenNotices: seen };
  return { notices: [...queue, notice], seenNotices: [...seen, id] };
}

export function liveFriendNotices(
  queue: FriendNotice[],
  lists: FriendLists,
  seats: SeatInvitation[]
) {
  return queue.filter((notice) => {
    if (notice.kind === 'request')
      return lists.added_you.some((p) => p.user_id === notice.player.user_id);
    if (notice.kind === 'seat')
      return seats.some(
        (seat) => friendNoticeId({ kind: 'seat', invitation: seat }) === friendNoticeId(notice)
      );
    return true;
  });
}

/** Finish the visible notice before taking the next, most urgent, one. */
export function nextFriendNotice(
  queue: FriendNotice[],
  currentId?: string
): FriendNotice | undefined {
  return (
    queue.find((notice) => friendNoticeId(notice) === currentId) ??
    queue.find((notice) => notice.kind === 'seat') ??
    queue.find((notice) => notice.kind === 'request') ??
    queue[0]
  );
}
