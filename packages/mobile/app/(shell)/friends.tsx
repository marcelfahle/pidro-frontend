import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { FriendPlayer } from '@pidro/shared';
import { useLobbyChannel } from '@/channels/hooks/useLobbyChannel';
import { AuthSheet } from '@/components/auth/AuthSheet';
import { PlayerProfileModal } from '@/components/profile/PlayerProfileModal';
import { usePillClearance } from '@/components/shell/TabPill';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PidroSpacing } from '@/design/tokens';
import { friendSections } from '@/features/friends';
import { FriendRow } from '@/features/friends/FriendRow';
import { friendsFixture } from '@/features/friends/fixtures';
import { useAuthStore } from '@/stores/auth';
import { addFriend, refreshFriends, removeFriend, useFriendsStore } from '@/stores/friends';

function LiveFriends() {
  useLobbyChannel();
  useFocusEffect(
    useCallback(() => {
      void refreshFriends().catch(() => undefined);
    }, [])
  );
  return null;
}

export default function FriendsScreen() {
  const router = useRouter();
  const { fixture } = useLocalSearchParams<{ fixture?: string }>();
  const preview = friendsFixture(fixture);
  const store = useFriendsStore();
  const guest = useAuthStore((state) => Boolean(state.user?.guest));
  const clearance = usePillClearance();
  const [accountOpen, setAccountOpen] = useState(guest);
  const [selected, setSelected] = useState<FriendPlayer | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const lists = preview ?? store;
  const sections = friendSections(lists);
  const loading = preview ? fixture === 'loading' : store.isLoading;
  const error = preview
    ? fixture === 'error'
      ? 'Could not update Friends. Please try again.'
      : null
    : store.error;

  return (
    <ScreenShell
      scroll
      compact
      testID="friends-screen"
      contentStyle={[
        styles.content,
        {
          paddingBottom: PidroSpacing.md + (guest ? 0 : clearance.bottom),
          paddingRight: PidroSpacing.md + (guest ? 0 : clearance.right),
        },
      ]}>
      {!guest && !preview ? <LiveFriends /> : null}
      <ScreenHeader title="Friends" onBack={() => router.replace('/home')} />
      {guest ? (
        <BevelButton label="Save your player" onPress={() => setAccountOpen(true)} />
      ) : (
        <>
          {error ? (
            <>
              <PidroText role="body" tone="danger" accessibilityRole="alert">
                {error}
              </PidroText>
              <BevelButton
                label="Retry"
                material="glass"
                onPress={() => {
                  if (!preview) void refreshFriends().catch(() => undefined);
                }}
              />
            </>
          ) : null}
          {loading ? (
            <PidroText role="body" tone="soft">
              Loading…
            </PidroText>
          ) : null}
          {sections.map((section) => (
            <View key={section.title}>
              <PidroText role="label" tone="soft">
                {section.title}
              </PidroText>
              {section.players.map((player) => (
                <FriendRow
                  key={player.user_id}
                  player={player}
                  onPress={() => setSelected(player)}
                  action={
                    section.addBack ? (
                      <BevelButton
                        label="Add back"
                        size="sm"
                        loading={pending === player.user_id}
                        disabled={pending !== null}
                        onPress={async () => {
                          if (preview) return;
                          setPending(player.user_id);
                          try {
                            await addFriend(player.user_id);
                          } catch {
                            /* The store shows the error. */
                          } finally {
                            setPending(null);
                          }
                        }}
                      />
                    ) : undefined
                  }
                />
              ))}
            </View>
          ))}
          {sections.length === 0 && !loading && !error ? (
            <PidroText role="body" tone="soft">
              Nobody here yet. Add the people you play with.
            </PidroText>
          ) : null}
          <BevelButton label="Add a friend" fullWidth onPress={() => router.push('/friends-add')} />
          <PlayerProfileModal
            playerId={selected?.user_id ?? null}
            onClose={() => setSelected(null)}
            fixture={
              preview && selected
                ? { ...selected, username: selected.display_name, bio: null, classic: null }
                : undefined
            }
            onRemove={
              selected && lists.friends.some((player) => player.user_id === selected.user_id)
                ? async () => {
                    if (!preview) await removeFriend(selected.user_id);
                    setSelected(null);
                  }
                : undefined
            }
          />
        </>
      )}
      <AuthSheet
        isOpen={accountOpen}
        onClose={() => {
          setAccountOpen(false);
          if (guest) router.replace('/home');
        }}
        onSaved={() => setAccountOpen(false)}
        onClaimClassic={() => {
          setAccountOpen(false);
          router.push({ pathname: '/(auth)/claim-classic', params: { from: 'friends' } });
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({ content: { gap: PidroSpacing.md } });
