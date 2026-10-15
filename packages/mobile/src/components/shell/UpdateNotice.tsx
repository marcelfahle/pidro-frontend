/**
 * "A new version is ready" — the shell's one notice. It sits in the flow at
 * the top of the shell, so it pushes the screen down rather than covering its
 * header, and it stops short of the landscape tab rail.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroLayout, PidroSpacing } from '@/design/tokens';

interface UpdateNoticeProps {
  restarting: boolean;
  onRestart: () => void;
  onDismiss: () => void;
  /** Space the landscape tab rail needs on the right. */
  rightClearance: number;
}

export function UpdateNotice({
  restarting,
  onRestart,
  onDismiss,
  rightClearance,
}: UpdateNoticeProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(200)}
      style={[
        styles.slot,
        {
          paddingTop: insets.top + PidroSpacing.xs,
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
          A new version is ready
        </PidroText>
        <View style={styles.actions}>
          <BevelButton
            testID="update-notice-restart"
            label="Restart"
            material="wood"
            size="sm"
            loading={restarting}
            onPress={onRestart}
            style={styles.restart}
          />
          <BevelButton
            accessibilityLabel="Dismiss"
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
    alignItems: 'center',
    paddingBottom: PidroSpacing.xs,
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
  },
  copy: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: PidroSpacing.xs },
  // Holds its width while the label turns into a spinner.
  restart: { minWidth: 96 },
});
