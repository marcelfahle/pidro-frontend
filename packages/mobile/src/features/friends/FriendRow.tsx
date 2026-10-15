import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FriendPlayer } from '@pidro/shared';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { presenceLabel } from './index';
import { useTranslation } from '@/i18n';

export function FriendRow({
  player,
  onPress,
  action,
}: {
  player: FriendPlayer;
  onPress?: () => void;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  const identity = (
    <>
      <PlayerAvatar size={48} uri={player.avatar_url} />
      <View style={styles.copy}>
        <PidroText role="label" numberOfLines={2}>
          {player.display_name}
        </PidroText>
        <View style={styles.presence}>
          {player.presence !== 'offline' ? <View style={styles.dot} /> : null}
          <PidroText role="metadata" tone="soft">
            {presenceLabel(player.presence)}
          </PidroText>
        </View>
      </View>
    </>
  );
  return (
    <View style={styles.row}>
      {onPress ? (
        <PressableFX
          accessibilityRole="button"
          accessibilityLabel={t('friends.view_profile', { name: player.display_name })}
          onPress={onPress}
          style={[styles.identity, player.presence === 'offline' && styles.offline]}>
          {identity}
        </PressableFX>
      ) : (
        <View style={[styles.identity, player.presence === 'offline' && styles.offline]}>
          {identity}
        </View>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    paddingVertical: PidroSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: PidroColors.border,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    minHeight: 48,
  },
  copy: { flex: 1, minWidth: 0, gap: PidroSpacing.xxs },
  presence: { flexDirection: 'row', alignItems: 'center', gap: PidroSpacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PidroColors.success },
  offline: { opacity: 0.55 },
});
