import type { FriendLists, FriendPlayer, FriendResult } from '@pidro/shared';

export function friendSections(lists: FriendLists) {
  return [
    { title: 'Added you', players: lists.added_you, addBack: true },
    { title: 'Friends', players: lists.friends, addBack: false },
  ].filter((section) => section.players.length > 0);
}

export function presenceLabel(presence: FriendPlayer['presence']) {
  return { online: 'Online', at_table: 'At a table', offline: 'Offline' }[presence];
}

export function relationLabel(relation: FriendResult['relation']) {
  return { none: 'Add', friend: 'Friend', added_you: 'Added you', added: 'Added' }[relation];
}

export function canSearch(query: string) {
  // Hermes has no Segmenter. The server checks the exact grapheme minimum.
  return Array.from(query.normalize('NFKC').trim()).length >= 3;
}
