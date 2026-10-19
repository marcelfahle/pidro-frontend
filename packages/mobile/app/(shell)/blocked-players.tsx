import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { localizedError } from '@pidro/shared';
import { FriendRow } from '@/components/friends/FriendRow';
import { usePillClearance } from '@/components/shell/TabPill';
import { ActionPill } from '@/components/ui/ActionPill';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PidroSpacing } from '@/design/tokens';
import { blockedFixture } from '@/features/friends/fixtures';
import { useAuthStore } from '@/stores/auth';
import { refreshBlockedPlayers, unblockPlayer, useFriendsStore } from '@/stores/friends';
import { useTranslation } from '@/i18n';

export default function BlockedPlayersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { fixture } = useLocalSearchParams<{ fixture?: string }>();
  const preview = blockedFixture(fixture);
  const guest = useAuthStore((state) => Boolean(state.user?.guest));
  const store = useFriendsStore();
  const clearance = usePillClearance();
  const [pending, setPending] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!guest && !blockedFixture(fixture)) void refreshBlockedPlayers().catch(() => undefined);
    }, [guest, fixture])
  );
  if (guest) return <Redirect href="/profile" />;
  const players = preview?.blocked ?? store.blocked;
  const loading = preview ? fixture === 'loading' : store.isLoading;
  const error = preview ? (fixture === 'error' ? true : null) : store.error;

  return (
    <ScreenShell
      scroll
      compact
      testID="blocked-players-screen"
      contentStyle={[
        styles.content,
        {
          paddingBottom: PidroSpacing.md + clearance.bottom,
          paddingRight: PidroSpacing.md + clearance.right,
        },
      ]}>
      <ScreenHeader title={t('blocks.title')} onBack={() => router.replace('/profile')} />
      {error ? (
        <>
          <PidroText role="body" tone="danger" accessibilityRole="alert">
            {localizedError(error, 'blocks.update_failed')}
          </PidroText>
          <BevelButton
            label={t('profile.retry')}
            material="glass"
            onPress={() => {
              if (!preview) void refreshBlockedPlayers().catch(() => undefined);
            }}
          />
        </>
      ) : null}
      {loading ? (
        <PidroText role="body" tone="soft">
          {t('profile.loading')}
        </PidroText>
      ) : null}
      {players.map((player) => (
        <FriendRow
          key={player.user_id}
          name={player.display_name}
          avatarUrl={player.avatar_url}
          row={{ variant: 'friend', dot: null, line: '', tone: 'quiet' }}
          trailing={
            <ActionPill
              label={t('blocks.unblock')}
              accessibilityLabel={t('blocks.unblock_player', { name: player.display_name })}
              loading={pending === player.user_id}
              disabled={pending !== null}
              onPress={async () => {
                if (preview) return;
                setPending(player.user_id);
                try {
                  await unblockPlayer(player.user_id);
                } catch {
                  /* The store shows the error. */
                } finally {
                  setPending(null);
                }
              }}
            />
          }
        />
      ))}
      {!loading && !error && players.length === 0 ? (
        <PidroText role="body" tone="soft">
          {t('blocks.empty')}
        </PidroText>
      ) : null}
      <PidroText role="body" tone="soft">
        {t('blocks.unblock_help')}
      </PidroText>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({ content: { gap: PidroSpacing.md } });
