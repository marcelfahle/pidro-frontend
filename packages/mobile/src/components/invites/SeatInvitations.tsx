import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SeatInvitation } from '@pidro/shared';
import { lobbyApi } from '@/api/lobby';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';
import { apiErrorInfo, localizedError } from '@/utils/apiErrors';
import { useTranslation } from '@/i18n';

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
  const invitations = fixture ?? stored;
  const [pending, setPending] = useState<string | null>(null);
  const busy = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [gone, setGone] = useState(false);

  const join = async (invitation: SeatInvitation) => {
    if (busy.current || fixture) return;
    busy.current = true;
    setPending(`${invitation.code}-${invitation.position}`);
    setError(null);
    setGone(false);
    const token = useAuthStore.getState().accessToken;
    try {
      const response = await lobbyApi.joinRoom(invitation.code, invitation.position);
      if (token !== useAuthStore.getState().accessToken) return;
      useLobbyStore.getState().upsertLobbyRoom(response.room, 'my_rejoinable');
      useAuthStore.getState().removeSeatInvitation(invitation);
      router.push(`/game/${invitation.code}`);
    } catch (caught) {
      if (token !== useAuthStore.getState().accessToken) return;
      const code = apiErrorInfo(caught).code?.toUpperCase();
      if (code === 'SEAT_TAKEN' || code === 'ROOM_NOT_FOUND' || code === 'ROOM_FULL') {
        setGone(true);
        useAuthStore.getState().removeSeatInvitation(invitation);
      } else setError(caught);
    } finally {
      busy.current = false;
      setPending(null);
    }
  };

  if (!invitations.length && !error && !gone) return null;
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
      {gone ? (
        <PidroText role="body" tone="soft" accessibilityRole="alert">
          {t('seat_invitation.gone')}
        </PidroText>
      ) : null}
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
