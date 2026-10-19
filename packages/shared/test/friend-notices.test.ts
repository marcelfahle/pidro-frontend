import { afterEach, expect, test } from 'bun:test';
import {
  isFriendRequest,
  isFriendAccepted,
  isSeatInvitation,
  isSeatInvitationGone,
  friendNoticeId,
  liveFriendNotices,
  nextFriendNotice,
  type FriendNotice,
} from '../src/features/friendNotices';
import { useFriendsStore } from '../src/stores/friends';

const player = {
  user_id: 'pekka',
  display_name: 'Pekka',
  avatar_url: null,
  presence: 'online' as const,
};
const request: FriendNotice = { kind: 'request', player, played_together_at: null };
const accepted: FriendNotice = { kind: 'accepted', player, source: 'accept' };
const seat: Extract<FriendNotice, { kind: 'seat' }> = {
  kind: 'seat',
  invitation: {
    code: 'TABLE',
    position: 'west',
    host_id: 'kalle',
    rule_set: 'finnish',
  },
};
afterEach(() => useFriendsStore.getState().reset());

test('friend payloads require the player, date field and known source without throwing', () => {
  expect(isFriendRequest(request)).toBe(true);
  expect(isFriendRequest({ ...request, played_together_at: '2026-10-18T10:00:00Z' })).toBe(true);
  expect(isFriendAccepted(accepted)).toBe(true);
  expect(isFriendAccepted({ ...accepted, source: 'link' })).toBe(true);
  for (const invalid of [
    null,
    [],
    {},
    { player },
    { ...request, played_together_at: 'bad' },
    { ...request, player: { ...player, avatar_url: undefined } },
  ])
    expect(isFriendRequest(invalid)).toBe(false);
  for (const invalid of [
    null,
    {},
    { player },
    { ...accepted, source: 'surprise' },
    { ...accepted, player: { ...player, presence: 'invisible' } },
  ])
    expect(isFriendAccepted(invalid)).toBe(false);
  expect(isSeatInvitation(seat.invitation)).toBe(true);
  expect(isSeatInvitationGone({ code: 'TABLE', position: 'east' })).toBe(true);
  for (const invalid of [
    null,
    {},
    { ...seat.invitation, host_id: undefined },
    { ...seat.invitation, rule_set: 'unknown' },
    { ...seat.invitation, host: {} },
  ])
    expect(isSeatInvitation(invalid)).toBe(false);
  expect(isSeatInvitationGone({ code: 'TABLE', position: 'partner' })).toBe(false);
});

test('one notice at a time: seats before requests before accepted; no repeats after dismissal', () => {
  const store = useFriendsStore.getState();
  store.setLists({ friends: [], added_you: [player], waiting_for_you: 2 });
  [accepted, request, seat, request, seat].forEach(store.queueNotice);
  expect(useFriendsStore.getState().notices).toHaveLength(3);
  expect(nextFriendNotice(useFriendsStore.getState().notices)).toEqual(seat);
  store.dismissNotice(friendNoticeId(seat));
  expect(nextFriendNotice(useFriendsStore.getState().notices)).toEqual(request);
  // Looking and Not now do not answer either server-owned request.
  store.dismissNotice(friendNoticeId(request));
  store.queueNotice(request);
  store.queueNotice(seat);
  expect(nextFriendNotice(useFriendsStore.getState().notices)).toEqual(accepted);
  expect(useFriendsStore.getState().waiting_for_you).toBe(2);
  expect(nextFriendNotice([accepted, seat], friendNoticeId(accepted))).toEqual(accepted);
});

test('authoritative lists remove answered/cancelled requests; seats vanish when gone', () => {
  const store = useFriendsStore.getState();
  store.setLists({ friends: [], added_you: [player], waiting_for_you: 3 });
  [request, accepted, seat].forEach(store.queueNotice);
  store.setLists({ friends: [player], added_you: [], waiting_for_you: 1 });
  expect(useFriendsStore.getState().waiting_for_you).toBe(1);
  expect(
    liveFriendNotices(useFriendsStore.getState().notices, useFriendsStore.getState(), [])
  ).toEqual([accepted]);
  store.setLists({ blocked: [] });
  expect(useFriendsStore.getState().waiting_for_you).toBe(1);
  store.setLists({ friends: [player], added_you: [], waiting_for_you: 0 });
  expect(useFriendsStore.getState().waiting_for_you).toBe(0);
  store.reset();
  expect(useFriendsStore.getState().notices).toEqual([]);
  expect(useFriendsStore.getState().seenNotices).toEqual([]);
});
