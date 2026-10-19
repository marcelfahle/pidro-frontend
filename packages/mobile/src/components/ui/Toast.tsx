import { useEffect } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePillClearance } from '@/components/shell/TabPill';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';
import { PidroText } from './PidroText';
import { PressableFX } from './PressableFX';

export interface ToastProps {
  message: string;
  action?: { label: string; onPress: () => void; disabled?: boolean };
  onDismiss: () => void;
}

/** Mount one toast per message; its optional action never blocks the rest of the screen. */
export function Toast({ message, action, onDismiss }: ToastProps) {
  const clearance = usePillClearance();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.position,
        {
          left: insets.left + PidroSpacing.md,
          right: Math.max(clearance.right, insets.right) + PidroSpacing.md,
          bottom: Math.max(clearance.bottom, insets.bottom + PidroSpacing.md),
        },
      ]}>
      <View testID="toast" style={styles.toast}>
        <PidroText role="body" accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </PidroText>
        {action ? (
          <PressableFX
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            disabled={action.disabled}
            style={styles.action}>
            <PidroText role="label" tone="cyan">
              {action.label}
            </PidroText>
          </PressableFX>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', alignItems: 'center' },
  toast: {
    width: '100%',
    maxWidth: PidroLayout.contentMaxWidth,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: PidroRadii.lg,
    borderWidth: 1.5,
    borderColor: PidroColors.noticeCyanBorder,
    backgroundColor: PidroColors.noticeFace,
    boxShadow: PidroColors.noticeShadow,
  },
  message: { flex: 1 },
  action: {
    flexShrink: 0,
    minHeight: PidroLayout.touchTarget,
    minWidth: PidroLayout.touchTarget,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
