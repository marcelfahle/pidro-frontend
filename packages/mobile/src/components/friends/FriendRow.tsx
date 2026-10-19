/**
 * One person with one status line, the same on Friends, Add a friend, the
 * empty state and the seat picker. The avatar and name are one tap target
 * that opens the friend's sheet; one control trails it: an action pill or
 * × passed in (a request has both, as on the board), a quiet "Sent" /
 * "Friends" label, or a chevron.
 * Presentational: the look comes from `friendRowState`.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PlayerAvatar, type AvatarRing } from '@/components/ui/PlayerAvatar';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroBevel, PidroColors, PidroLayout, PidroRadii } from '@/design/tokens';
import type { FriendRowState } from '@/features/friends';
import { useTranslation } from '@/i18n';

export interface FriendRowProps {
  name: string;
  avatarUrl?: string | null;
  ring?: AvatarRing;
  row: FriendRowState;
  /** Opens the friend's sheet. */
  onPress?: () => void;
  trailing?: ReactNode | 'chevron' | 'sent' | 'friends';
  /** Greyed and inert, as a busy friend in the seat picker. */
  dimmed?: boolean;
}

const LINE_COLOR = {
  green: PidroColors.success,
  gold: PidroBevel.textGold,
  quiet: PidroColors.textSoft,
} as const;

export function FriendRow({
  name,
  avatarUrl,
  ring = 'glass',
  row,
  onPress,
  trailing,
  dimmed = false,
}: FriendRowProps) {
  const { t } = useTranslation();
  const identity = (
    <>
      <View style={row.variant === 'sent' && styles.faded}>
        <PlayerAvatar size={44} uri={avatarUrl} ring={ring} />
        {row.dot ? (
          <View style={[styles.dot, row.dot === 'online' ? styles.dotOnline : styles.dotTable]} />
        ) : null}
      </View>
      <View style={styles.copy}>
        <PidroText role="label" numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.name}>
          {name}
        </PidroText>
        <PidroText
          role="metadata"
          numberOfLines={2}
          maxFontSizeMultiplier={1.3}
          style={[styles.line, { color: LINE_COLOR[row.tone] }]}>
          {row.line}
        </PidroText>
      </View>
      {trailing === 'chevron' ? (
        <View style={styles.chevron}>
          <Icon name="chevron-right" size={18} strokeWidth={2.4} color={PidroColors.textSoft} />
        </View>
      ) : null}
    </>
  );

  return (
    <View
      style={[
        styles.row,
        row.variant === 'request' && styles.request,
        row.variant === 'sent' && styles.sent,
        row.variant === 'fresh' && styles.fresh,
        dimmed && styles.dimmed,
      ]}>
      {onPress && !dimmed ? (
        <PressableFX
          accessibilityRole="button"
          accessibilityLabel={t('friends.view_profile', { name })}
          accessibilityHint={row.line}
          onPress={onPress}
          style={styles.identity}>
          {identity}
        </PressableFX>
      ) : (
        <View
          accessible
          accessibilityLabel={`${name}, ${row.line}`}
          accessibilityState={{ disabled: dimmed }}
          style={styles.identity}>
          {identity}
        </View>
      )}
      {trailing === 'sent' || trailing === 'friends' ? (
        <View style={styles.state}>
          <Icon
            name={trailing === 'sent' ? 'clock' : 'check'}
            size={16}
            strokeWidth={2.6}
            color={trailing === 'sent' ? PidroColors.textSoft : PidroColors.success}
          />
          <PidroText
            role="label"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={trailing === 'sent' ? styles.stateSent : styles.stateFriends}>
            {t(trailing === 'sent' ? 'friends.sent' : 'friends.are_friends')}
          </PidroText>
        </View>
      ) : trailing !== 'chevron' ? (
        trailing
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 64,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: PidroRadii.lg,
    borderWidth: 1,
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.panelSoft,
  },
  request: {
    borderWidth: 1.5,
    borderColor: PidroColors.friendAskBorder,
    backgroundColor: PidroColors.friendAskBg,
  },
  sent: { borderStyle: 'dashed', backgroundColor: PidroColors.friendSentBg },
  fresh: { borderWidth: 1.5, borderColor: PidroColors.presenceOnline },
  dimmed: { opacity: 0.5 },
  identity: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faded: { opacity: 0.7 },
  dot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 13,
    height: 13,
    borderRadius: PidroRadii.full,
    borderWidth: 2,
    borderColor: PidroBevel.panelDeep,
  },
  dotOnline: { backgroundColor: PidroColors.presenceOnline },
  dotTable: { backgroundColor: PidroBevel.textGold },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontSize: 16, lineHeight: 20 },
  line: { fontSize: 13, lineHeight: 17, letterSpacing: 0 },
  chevron: { marginRight: 6 },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: PidroLayout.touchTarget,
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  stateSent: { color: PidroColors.textSoft },
  stateFriends: { color: PidroColors.success },
});
