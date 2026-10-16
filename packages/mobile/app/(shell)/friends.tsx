import { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { localizedError, type FriendPlayer } from '@pidro/shared';
import { useLobbyChannel } from '@/channels/hooks/useLobbyChannel';
import { AuthSheet } from '@/components/auth/AuthSheet';
import { PlayerProfileModal } from '@/components/profile/PlayerProfileModal';
import { useNoticeInset, usePillClearance } from '@/components/shell/TabPill';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { TextLink } from '@/components/ui/TextLink';
import { PidroSpacing } from '@/design/tokens';
import { classicFriendsMessage, friendSections } from '@/features/friends';
import { FriendRow } from '@/features/friends/FriendRow';
import { friendsFixture } from '@/features/friends/fixtures';
import { useAuthStore } from '@/stores/auth';
import { addFriend, refreshFriends, removeFriend, useFriendsStore } from '@/stores/friends';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation();
  const router = useRouter();
  const { fixture } = useLocalSearchParams<{ fixture?: string }>();
  const preview = friendsFixture(fixture);
  const store = useFriendsStore();
  const guest = useAuthStore((state) => Boolean(state.user?.guest));
  const clearance = usePillClearance();
  const noticeInset = useNoticeInset();
  const [accountOpen, setAccountOpen] = useState(guest);
  const [selected, setSelected] = useState<FriendPlayer | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [shareError, setShareError] = useState(false);
  const lists = preview ?? store;
  const sections = friendSections(lists);
  const classicMessage = classicFriendsMessage(lists);
  const loading = preview ? fixture === 'loading' : store.isLoading;
  const error = preview ? fixture === 'error' : store.error;

  return (
    <ScreenShell
      scroll
      compact
      testID="friends-screen"
      contentStyle={[
        styles.content,
        {
          paddingBottom: PidroSpacing.md + (guest ? noticeInset : clearance.bottom),
          paddingRight: PidroSpacing.md + (guest ? 0 : clearance.right),
        },
      ]}>
      {!guest && !preview ? <LiveFriends /> : null}
      <ScreenHeader title={t('social.friends')} onBack={() => router.replace('/home')} />
      {guest ? (
        <BevelButton label={t('auth.sheet_save_title')} onPress={() => setAccountOpen(true)} />
      ) : (
        <>
          {error ? (
            <>
              <PidroText role="body" tone="danger" accessibilityRole="alert">
                {localizedError(error, 'friends.update_failed')}
              </PidroText>
              <BevelButton
                label={t('profile.retry')}
                material="glass"
                onPress={() => {
                  if (!preview) void refreshFriends().catch(() => undefined);
                }}
              />
            </>
          ) : null}
          {loading ? (
            <PidroText role="body" tone="soft">
              {t('profile.loading')}
            </PidroText>
          ) : null}
          {sections.map((section) => (
            <View key={section.addBack ? 'added_you' : 'friends'}>
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
                        label={t('friends.add_back')}
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
              {t('friends.empty')}
            </PidroText>
          ) : null}
          {classicMessage ? (
            <View testID="friends-classic-count">
              <PidroText role="body" tone="soft">
                {classicMessage}
              </PidroText>
              <TextLink
                label={t('friends.share_app')}
                onPress={async () => {
                  setShareError(false);
                  try {
                    await Share.share({
                      message: t('friends.share_app_message', { url: 'https://www.pidro.online/' }),
                    });
                  } catch {
                    setShareError(true);
                  }
                }}
              />
              {shareError ? (
                <PidroText role="body" tone="danger" accessibilityRole="alert">
                  {t('invite.host.shareError')}
                </PidroText>
              ) : null}
            </View>
          ) : null}
          <BevelButton
            label={t('friends.add_friend')}
            fullWidth
            onPress={() => router.push('/friends-add')}
          />
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
