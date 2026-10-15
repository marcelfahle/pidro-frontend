import { StyleSheet } from 'react-native';
import { useTranslation } from '@/i18n';
import { BevelPressable } from './Bevel';
import { Icon } from './Icon';

export interface BackButtonProps {
  onPress: () => void;
  /** 44 on phones, 48 on tablets. */
  size?: number;
  accessibilityLabel?: string;
  testID?: string;
  disabled?: boolean;
}

/** The round glass back control that heads a sub-screen. */
export function BackButton({
  onPress,
  size = 44,
  accessibilityLabel,
  testID,
  disabled = false,
}: BackButtonProps) {
  const { t } = useTranslation();
  return (
    <BevelPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t('ui.back')}
      material="glass"
      radius={size / 2}
      onPress={onPress}
      testID={testID}
      disabled={disabled}
      style={[styles.rim, { width: size, height: size }]}
      contentStyle={styles.face}>
      <Icon name="chevron-left" size={size >= 48 ? 22 : 20} strokeWidth={2.4} />
    </BevelPressable>
  );
}

const styles = StyleSheet.create({
  rim: {
    flexShrink: 0,
  },
  face: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // The chevron's mass sits right of its box; nudge it onto the optical centre.
    paddingRight: 2,
  },
});
