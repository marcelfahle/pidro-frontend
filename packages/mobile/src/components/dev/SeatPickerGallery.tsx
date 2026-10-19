import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SeatPickerContainer } from '@/components/invites/SeatPickerContainer';
import type { ChoiceSection } from '@/components/invites/ChoiceList';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import type { PickerFriend } from '@/features/lobby/friendPicker';
import { relativeDay } from '@/features/relativeDay';
import { useTranslation } from '@/i18n';

const sections: ChoiceSection[] = [
  {
    title: 'Fill it now',
    items: [
      {
        id: 'friend',
        kind: 'deeper',
        title: 'A friend',
        subtitle: 'Choose who to invite',
        icon: 'person-plus',
      },
      { id: 'bot', title: 'Bot', subtitle: 'Plays right away', icon: 'bot' },
    ],
  },
  {
    title: 'Leave it open',
    items: [
      { id: 'anyone', title: 'Anyone', subtitle: 'Anyone can join from Tables', icon: 'plus' },
      {
        id: '100',
        title: '100+ games played',
        subtitle: 'For players with some experience',
        shortSubtitle: 'Some experience',
        badge: '100',
      },
      {
        id: '1000',
        title: '1000+ games played',
        subtitle: 'For very experienced players',
        shortSubtitle: 'Very experienced players',
        badge: '1k',
      },
      {
        id: 'password',
        title: 'With password 4821',
        subtitle: 'Only people you give it to can sit',
        shortSubtitle: 'Only people you give it to',
        icon: 'lock',
      },
    ],
  },
];

const people: PickerFriend[] = [
  { id: 'maija', name: 'Maija', section: 'online', availability: 'online' },
  { id: 'pekka', name: 'Pekka', section: 'online', availability: 'bots' },
  { id: 'hanna', name: 'Hanna', section: 'offline', availability: 'offline' },
  { id: 'mikko', name: 'Mikko', section: 'offline', availability: 'offline' },
  { id: 'sanna', name: 'Sanna', section: 'offline', availability: 'taken' },
  { id: 'erkki', name: 'Erkki', section: 'offline', availability: 'selected' },
  { id: 'nora', name: 'Nora', section: 'busy', availability: 'others' },
];

export function SeatPickerGallery({ fixture }: { fixture?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('100');
  const [invited, setInvited] = useState('');
  const friends =
    fixture === 'empty'
      ? []
      : fixture === 'many'
        ? [
            ...people,
            ...Array.from({ length: 23 }, (_, i): PickerFriend => ({
              id: `extra-${i}`,
              name: `Friend ${String(i + 1).padStart(2, '0')}`,
              section: 'offline',
              availability: 'offline',
            })),
          ]
        : people;
  const datedFriends = friends.map((friend) => ({
    ...friend,
    lastPlayedLabel: t('friends.played', {
      when: relativeDay('2026-10-18T12:00:00Z', new Date('2026-10-19T12:00:00Z'))!,
    }),
  }));
  return (
    <ScreenShell contentStyle={styles.shell}>
      <View style={styles.content}>
        <PidroText role="title">Seat picker — sheet, full screen, panel</PidroText>
        <PidroText testID="seat-picker-result">{invited || selected}</PidroText>
        <BevelButton label="Open seat picker" onPress={() => setOpen(true)} />
        {open && (
          <SeatPickerContainer
            title="Opponent seat"
            subtitle="Plays on the other team."
            initialPage={fixture === 'choices' ? 'choices' : 'friends'}
            choices={{
              sections: sections.map((section) => ({
                ...section,
                items: section.items.map((item) =>
                  item.kind === 'deeper' && invited ? { ...item, subtitle: invited } : item
                ),
              })),
              selectedId: selected,
              onSelect: setSelected,
            }}
            friends={{
              friends: datedFriends,
              searchText: search,
              onSearchChange: setSearch,
              onInvite: (friend) => {
                setInvited(friend.name);
                setSelected('friend');
              },
              onAddFriends: () => {
                setInvited('Add friends');
                setOpen(false);
              },
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shell: { justifyContent: 'center' },
  content: { padding: 20, gap: 16, alignItems: 'center' },
});
