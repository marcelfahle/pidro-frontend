export type PickerSection = 'online' | 'offline' | 'busy';
export type PickerAvailability = 'online' | 'bots' | 'offline' | 'others' | 'taken' | 'selected';

/** The caller maps server presence and seat assignments once, before rendering. */
export interface PickerFriend {
  id: string;
  name: string;
  avatarUrl?: string | null;
  section: PickerSection;
  availability: PickerAvailability;
  lastPlayedLabel?: string;
}

export function groupPickerFriends(friends: readonly PickerFriend[], query: string) {
  const needle = query.normalize('NFKC').trim().toLocaleLowerCase();
  return (['online', 'offline', 'busy'] as const)
    .map((section) => ({
      section,
      friends: friends.filter(
        (friend) =>
          friend.section === section &&
          friend.name.normalize('NFKC').toLocaleLowerCase().includes(needle)
      ),
    }))
    .filter((group) => group.friends.length > 0);
}
