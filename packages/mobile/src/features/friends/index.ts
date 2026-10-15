import { t, type FriendLists, type FriendPlayer, type FriendResult } from '@pidro/shared';

export function friendSections(lists: FriendLists) {
  return [
    { title: t('friends.added_you'), players: lists.added_you, addBack: true },
    { title: t('social.friends'), players: lists.friends, addBack: false },
  ].filter((section) => section.players.length > 0);
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
