/**
 * A seat held for you, shown at the top of a game with bots (PID-258). Join
 * leaves this game and sits you in the held seat in one step; Not now tells
 * the host and the bots play on. It may cover North, never the hand.
 */
import { useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SeatInvitation } from '@pidro/shared';
import { lobbyApi } from '@/api/lobby';
import { NoticeCard } from '@/components/friends/NoticeCard';
import { declineSeatInvitation, joinSeatInvitation } from '@/components/invites/SeatInvitations';
import { PidroSpacing } from '@/design/tokens';
import { tableInvitationLine } from '@/features/invites/tableInvitation';
import { headerTop } from '@/game/canvas/TableChrome';
import { useTranslation } from '@/i18n';
import { useGameStore } from '@/stores/game';
import { apiErrorInfo, localizedError } from '@/utils/apiErrors';

export function TableInvitation({
  invitation,
  roomCode,
  onLeaving,
  fixture = false,
}: {
  invitation: SeatInvitation;
  roomCode: string;
  /** True while this table is being left, false if it stays. */
  onLeaving?: (leaving: boolean) => void;
  fixture?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // A phone on its side has no room above North's played card for two rows,
  // nor any above a bid, trump or hand window: the card waits for your choice.
  const row = width > height && height < 500;
  const choosing = useGameStore((s) =>
    s.legalActions.some((action) => action.type !== 'play_card')
  );
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [hidden, setHidden] = useState(false);
  const name = invitation.host?.display_name || t('social.player');

  const join = async () => {
    if (busy.current || fixture) return;
    busy.current = true;
    setLoading(true);
    setError(undefined);
    onLeaving?.(true);
    try {
      await lobbyApi.leaveRoom(roomCode).catch((caught: unknown) => {
        if (apiErrorInfo(caught).code?.toUpperCase() !== 'NOT_IN_ROOM') throw caught;
      });
    } catch (caught) {
      // Still seated here: the bots play on and the invitation stays.
      onLeaving?.(false);
      setError(localizedError(caught, 'social.join_failed'));
      busy.current = false;
      setLoading(false);
      return;
    }
    // This game is over either way. Tables says the seat is gone, or still offers it.
    const joined = await joinSeatInvitation(invitation).catch(() => false);
    router.replace(joined ? `/game/${invitation.code}` : '/lobby');
  };

  if (hidden || (row && choosing && !loading)) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.slot,
        {
          top: headerTop(insets.top),
          paddingLeft: insets.left + PidroSpacing.md,
          paddingRight: insets.right + PidroSpacing.md,
        },
      ]}>
      <NoticeCard
        testID="table-invitation"
        variant="seat"
        ring="gold"
        title={t('seat_invitation.waiting', { name })}
        body={tableInvitationLine(invitation, name)}
        avatarUrl={invitation.host?.avatar_url}
        primary={{
          label: t('friend_notice.join', { name }),
          loading,
          onPress: () => void join(),
        }}
        secondary={{
          label: t('friend_notice.not_now'),
          onPress: () => {
            if (busy.current) return;
            if (fixture) setHidden(true);
            else void declineSeatInvitation(invitation);
          },
        }}
        footnote={error ?? t('friend_notice.ends_bot_game')}
        row={row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 160,
    elevation: 160,
  },
});
