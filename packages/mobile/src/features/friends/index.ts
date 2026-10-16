import {
  t,
  formatNumber,
  type FriendLists,
  type FriendPlayer,
  type FriendResult,
  type RelativePlayerView,
} from '@pidro/shared';

export function friendSections(lists: FriendLists) {
  return [
    { title: t('friends.added_you'), players: lists.added_you, addBack: true },
    { title: t('social.friends'), players: lists.friends, addBack: false },
  ].filter((section) => section.players.length > 0);
}

export function classicFriendsMessage(lists: FriendLists): string | null {
  const count = lists.classic?.not_here ?? 0;
  return count > 0 ? t('friends.classic_not_here', { count, number: formatNumber(count) }) : null;
}

export function presenceLabel(presence: FriendPlayer['presence']) {
  return t(`friends.${presence}`);
}

export function relationLabel(relation: FriendResult['relation']) {
  return t(relation === 'none' ? 'friends.add' : `friends.${relation}`);
}

export function canSearch(query: string) {
  // Hermes has no Segmenter. The server checks the exact grapheme minimum.
  return Array.from(query.normalize('NFKC').trim()).length >= 3;
}

export function canViewPlayer(player: Pick<RelativePlayerView, 'playerId' | 'seatStatus'>) {
  // A substitute keeps the reserved human's ID; actual bots have bot_ IDs.
  return (
    !!player.playerId &&
    !player.playerId.startsWith('bot_') &&
    player.seatStatus !== 'permanent_bot' &&
    player.seatStatus !== 'vacant'
  );
}
