import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import {
  friendNoticeId,
  liveFriendNotices,
  nextFriendNotice,
  type FriendNotice,
} from '@pidro/shared';
import { NoticeCard } from '@/components/friends/NoticeCard';
import { declineSeatInvitation, joinSeatInvitation } from '@/components/invites/SeatInvitations';
import { friendNoticeFixture } from '@/features/friends/fixtures';
import { relativeDay } from '@/features/relativeDay';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { addFriend, useFriendsStore } from '@/stores/friends';
import { localizedError } from '@/utils/apiErrors';

export function useShellFriendNotice(enabled: boolean, fixture?: string) {
  const state = useFriendsStore();
  const seats = useAuthStore((s) => s.seatInvitations);
  const fixtures = useMemo(() => friendNoticeFixture(fixture), [fixture]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string>();
  const queue = fixtures
    ? fixtures.filter((notice) => !dismissed.includes(friendNoticeId(notice)))
    : liveFriendNotices(state.notices, state, seats);
  const notice = enabled ? nextFriendNotice(queue, currentId) : undefined;
  const id = notice && friendNoticeId(notice);
  if (enabled && id !== currentId) setCurrentId(id);
  const dismiss = () => {
    if (!id) return;
    if (fixtures) setDismissed((previous) => [...previous, id]);
    else state.dismissNotice(id);
  };
  return { notice, dismiss, fixture: Boolean(fixtures) };
}

export function FriendNoticeHost({
  notice,
  dismiss,
  fixture,
  style,
  onHeight,
}: {
  notice: FriendNotice;
  dismiss: () => void;
  fixture: boolean;
  style: StyleProp<ViewStyle>;
  onHeight: (height: number) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const dismissRef = useRef(dismiss);
  useEffect(() => {
    dismissRef.current = dismiss;
  }, [dismiss]);
  useEffect(() => {
    if ((notice.kind !== 'accepted' && notice.kind !== 'too_late') || fixture) return;
    const timer = setTimeout(() => dismissRef.current(), 4000);
    return () => clearTimeout(timer);
  }, [notice.kind, fixture]);

  const answer = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(undefined);
    const token = useAuthStore.getState().accessToken;
    try {
      if (fixture) {
        dismiss();
      } else if (notice.kind === 'request') {
        await addFriend(notice.player.user_id);
        if (token === useAuthStore.getState().accessToken) dismiss();
      } else if (notice.kind === 'seat') {
        if (await joinSeatInvitation(notice.invitation)) {
          dismiss();
          router.push(`/game/${notice.invitation.code}`);
        }
      }
    } catch (caught) {
      if (token === useAuthStore.getState().accessToken)
        setError(
          localizedError(
            caught,
            notice.kind === 'seat' ? 'social.join_failed' : 'friends.add_failed'
          )
        );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const asks = notice.kind === 'request' || notice.kind === 'seat';
  const name =
    'player' in notice
      ? notice.player.display_name
      : notice.invitation.host?.display_name || t('social.player');
  const when =
    notice.kind === 'request' && notice.played_together_at
      ? relativeDay(notice.played_together_at)
      : null;
  const body =
    notice.kind === 'seat'
      ? notice.invitation.rule_set && t(`social.${notice.invitation.rule_set}`)
      : when
        ? t('friend_notice.played_together', { when })
        : undefined;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.slot, style]}
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}>
      <NoticeCard
        testID="friend-notice"
        variant={notice.kind}
        title={t(
          notice.kind === 'seat'
            ? 'seat_invitation.waiting'
            : notice.kind === 'accepted' && notice.source === 'link'
              ? 'friend_notice.linked'
              : `friend_notice.${notice.kind}`,
          { name }
        )}
        body={body}
        avatarUrl={
          'player' in notice ? notice.player.avatar_url : notice.invitation.host?.avatar_url
        }
        primary={
          asks
            ? {
                label: t(notice.kind === 'seat' ? 'seat_invitation.sit' : 'friend_notice.accept'),
                loading,
                onPress: () => void answer(),
              }
            : undefined
        }
        secondary={
          asks
            ? {
                label: t('friend_notice.not_now'),
                onPress: () => {
                  if (busy.current) return;
                  if (notice.kind === 'seat' && !fixture)
                    void declineSeatInvitation(notice.invitation);
                  dismiss();
                },
              }
            : undefined
        }
        footnote={error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
