import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SeatInvitation } from '@pidro/shared';
import { lobbyApi } from '@/api/lobby';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import { refreshFriends, useFriendsStore } from '@/stores/friends';
import { NoticeCard } from '@/components/friends/NoticeCard';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';
import { apiErrorInfo, localizedError } from '@/utils/apiErrors';
import { useTranslation } from '@/i18n';

export async function joinSeatInvitation(invitation: SeatInvitation): Promise<boolean> {
  const token = useAuthStore.getState().accessToken;
  try {
    const response = await lobbyApi.joinRoom(invitation.code, invitation.position);
    if (token !== useAuthStore.getState().accessToken) return false;
    useLobbyStore.getState().upsertLobbyRoom(response.room, 'my_rejoinable');
    useAuthStore.getState().removeSeatInvitation(invitation);
    return true;
  } catch (error) {
    if (token !== useAuthStore.getState().accessToken) return false;
    if (seatGone(error)) {
      useAuthStore.getState().removeSeatInvitation(invitation);
      useFriendsStore.getState().lateSeat(invitation);
    }
    throw error;
  } finally {
    if (token === useAuthStore.getState().accessToken) void refreshFriends().catch(() => undefined);
  }
}

/** Not now: the invitation goes at once; a seat already gone is the same answer. */
export async function declineSeatInvitation(invitation: SeatInvitation): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  useAuthStore.getState().removeSeatInvitation(invitation);
  try {
    await lobbyApi.declineSeatInvitation(invitation.code, invitation.position);
  } catch (error) {
    if (token !== useAuthStore.getState().accessToken) return;
    if (apiErrorInfo(error).code?.toUpperCase() === 'INVITATION_GONE') return;
    console.warn('[SeatInvitations] Not now failed; the invitation stays.');
    useAuthStore.getState().receiveSeatInvitation(invitation);
  } finally {
    if (token === useAuthStore.getState().accessToken) void refreshFriends().catch(() => undefined);
  }
}

function seatGone(error: unknown) {
  const code = apiErrorInfo(error).code?.toUpperCase();
  return code === 'SEAT_TAKEN' || code === 'ROOM_NOT_FOUND' || code === 'ROOM_FULL';
}

export function SeatInvitations({
  fixture,
  scrollable = false,
}: {
  fixture?: SeatInvitation[];
  scrollable?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const stored = useAuthStore((state) => state.seatInvitations);
  const notices = useFriendsStore((state) => state.notices);
  const invitations = fixture ?? stored;
  const late = fixture
    ? []
    : notices.flatMap((notice) => (notice.kind === 'too_late' ? [notice.invitation] : []));
  const [pending, setPending] = useState<string | null>(null);
  const busy = useRef(false);
  const [error, setError] = useState<unknown>(null);

  const join = async (invitation: SeatInvitation) => {
    if (busy.current || fixture) return;
    busy.current = true;
    setPending(`${invitation.code}-${invitation.position}`);
    setError(null);
    const token = useAuthStore.getState().accessToken;
    try {
      if (await joinSeatInvitation(invitation)) router.push(`/game/${invitation.code}`);
    } catch (caught) {
      if (token === useAuthStore.getState().accessToken && !seatGone(caught)) setError(caught);
    } finally {
      busy.current = false;
      setPending(null);
    }
  };

  if (!invitations.length && !late.length && !error) return null;
  const content = (
    <View testID="seat-invitations" style={styles.list}>
      {invitations.map((invitation) => {
        const key = `${invitation.code}-${invitation.position}`;
        return (
          <Surface key={key} variant="subtle" style={styles.row}>
            <PlayerAvatar size={40} uri={invitation.host?.avatar_url} />
            <PidroText role="label" style={styles.copy}>
              {t('seat_invitation.waiting', {
                name: invitation.host?.display_name || t('social.player'),
              })}
            </PidroText>
            <BevelButton
              label={t('seat_invitation.sit')}
              size="sm"
              disabled={pending !== null}
              loading={pending === key}
              onPress={() => void join(invitation)}
            />
          </Surface>
        );
      })}
      {late.map((invitation) => (
        <NoticeCard
          key={`${invitation.code}-${invitation.position}`}
          variant="too_late"
          title={t('friend_notice.too_late', {
            name: invitation.host?.display_name || t('social.player'),
          })}
          avatarUrl={invitation.host?.avatar_url}
        />
      ))}
      {error ? (
        <PidroText role="body" tone="danger" accessibilityRole="alert">
          {localizedError(error, 'social.join_failed')}
        </PidroText>
      ) : null}
    </View>
  );
  return scrollable ? <ScrollView style={styles.scroll}>{content}</ScrollView> : content;
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 220, flexGrow: 0 },
  list: { width: '100%', gap: PidroSpacing.sm },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    padding: PidroSpacing.sm,
  },
  copy: { flex: 1, minWidth: 100 },
});
