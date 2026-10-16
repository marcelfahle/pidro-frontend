/**
 * "A new version is ready" — the shell's one notice. A floating card over the
 * screen, anchored just above the tab pill (above the bottom safe area when
 * there is no bottom pill) and short of the landscape tab rail, so showing or
 * hiding it never moves anything.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';
import { useTranslation } from '@/i18n';

interface UpdateNoticeProps {
  restarting: boolean;
  onRestart: () => void;
  onDismiss: () => void;
  /** Distance from the screen bottom: above the bottom pill or the safe area. */
  bottom: number;
  /** Space the landscape tab rail needs on the right. */
  rightClearance: number;
  onHeight: (height: number) => void;
}

export function UpdateNotice({
  restarting,
  onRestart,
  onDismiss,
  bottom,
  rightClearance,
  onHeight,
}: UpdateNoticeProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(200)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(160)}
      pointerEvents="box-none"
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      style={[
        styles.slot,
        {
          bottom,
          paddingLeft: insets.left + PidroSpacing.md,
          paddingRight: Math.max(insets.right + PidroSpacing.md, rightClearance),
        },
      ]}>
      <Surface
        testID="update-notice"
        variant="window"
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={styles.notice}>
        <Icon name="rematch" size={20} color={PidroColors.cyan} />
        <PidroText role="label" style={styles.copy}>
          {t('update.notice')}
        </PidroText>
        <View style={styles.actions}>
          <BevelButton
            testID="update-notice-restart"
            label={t('update.restart')}
            material="wood"
            size="sm"
            loading={restarting}
            onPress={onRestart}
            style={styles.restart}
          />
          <BevelButton
            accessibilityLabel={t('update.dismiss')}
            material="glass"
            size="icon"
            onPress={onDismiss}>
            <Icon name="close" size={20} />
          </BevelButton>
        </View>
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  notice: {
    width: '100%',
    maxWidth: PidroLayout.contentMaxWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    paddingVertical: PidroSpacing.xs,
    paddingLeft: PidroSpacing.md,
    paddingRight: PidroSpacing.xs,
    boxShadow: PidroBevel.heroDropShadow,
  },
  copy: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: PidroSpacing.xs },
  // Holds its width while the label turns into a spinner.
  restart: { minWidth: 96 },
});
