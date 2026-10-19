import { ScrollView, StyleSheet, View } from 'react-native';
import { FriendRow } from '@/components/friends/FriendRow';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { TextLink } from '@/components/ui/TextLink';
import { groupPickerFriends, type PickerFriend } from '@/features/lobby/friendPicker';
import { useTranslation } from '@/i18n';

export interface FriendPickerProps {
  friends: readonly PickerFriend[];
  searchText: string;
  onSearchChange: (text: string) => void;
  onInvite: (friend: PickerFriend) => void;
  onAddFriends: () => void;
  compact?: boolean;
  columns?: 1 | 2;
  /** Shorter rows, so a sideways phone shows four rows of two. */
  dense?: boolean;
}

export function FriendPicker({
  friends,
  searchText,
  onSearchChange,
  onInvite,
  onAddFriends,
  compact = false,
  columns = 1,
  dense = false,
}: FriendPickerProps) {
  const { t } = useTranslation();
  const grouped = groupPickerFriends(friends, searchText);
  // Without their titles the groups read as one list, so they flow as one grid.
  const groups =
    compact && grouped.length
      ? [{ ...grouped[0], friends: grouped.flatMap((group) => group.friends) }]
      : grouped;
  return (
    <View testID="friend-picker" style={styles.picker}>
      {friends.length > 0 && (
        <Input
          accessibilityLabel={t('seat_friend.find')}
          placeholder={t('seat_friend.find')}
          value={searchText}
          onChangeText={onSearchChange}
          autoCorrect={false}
          compact={dense}
        />
      )}
      <ScrollView
        testID="friend-picker-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {friends.length === 0 ? (
          <>
            <PidroText role="body">{t('seat_friend.empty')}</PidroText>
            <TextLink label={t('seat_friend.add')} onPress={onAddFriends} />
          </>
        ) : groups.length === 0 ? (
          <PidroText role="body">{t('friends.no_results')}</PidroText>
        ) : (
          groups.map((group) => (
            <View key={group.section} style={styles.section}>
              {!compact && (
                <View style={styles.heading}>
                  <PidroText role="eyebrow" tone="cyan">
                    {t(
                      group.section === 'online'
                        ? 'picker.online'
                        : group.section === 'offline'
                          ? 'friends.not_online'
                          : 'friends.with_others'
                    )}
                  </PidroText>
                  {group.section !== 'online' && (
                    <PidroText role="metadata" tone="soft">
                      {t(group.section === 'offline' ? 'picker.offline_help' : 'picker.busy_help')}
                    </PidroText>
                  )}
                </View>
              )}
              <View style={[styles.grid, dense && styles.denseGrid]}>
                {group.friends.map((friend) => {
                  const state = friend.availability;
                  const unavailable = state === 'others' || state === 'taken';
                  const selected = state === 'selected';
                  const line =
                    state === 'offline' && !compact && friend.lastPlayedLabel
                      ? friend.lastPlayedLabel
                      : t(
                          state === 'online'
                            ? 'picker.online'
                            : state === 'bots'
                              ? 'friends.with_bots'
                              : state === 'offline'
                                ? 'friends.not_online'
                                : state === 'others'
                                  ? 'friends.with_others'
                                  : state === 'taken'
                                    ? 'picker.taken'
                                    : 'picker.selected'
                        );
                  return (
                    <View key={friend.id} style={columns === 2 ? styles.half : styles.full}>
                      <FriendRow
                        name={friend.name}
                        avatarUrl={friend.avatarUrl}
                        accessibilityLabel={
                          selected ? friend.name : t('seat_friend.invite', { name: friend.name })
                        }
                        dimmed={unavailable}
                        selected={selected}
                        dense={dense}
                        onPress={() => onInvite(friend)}
                        row={{
                          variant: 'friend',
                          line,
                          dot:
                            state === 'online' || state === 'bots'
                              ? 'online'
                              : state === 'others'
                                ? 'table'
                                : null,
                          tone: selected
                            ? 'gold'
                            : state === 'online' || state === 'bots'
                              ? 'green'
                              : 'quiet',
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { flex: 1, minHeight: 0, gap: 8 },
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: 12, paddingBottom: 8 },
  section: { gap: 6 },
  heading: { paddingHorizontal: 8, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  denseGrid: { gap: 4 },
  full: { width: '100%' },
  half: { width: '49%', flexGrow: 1, flexBasis: '47%', maxWidth: '50%' },
});
