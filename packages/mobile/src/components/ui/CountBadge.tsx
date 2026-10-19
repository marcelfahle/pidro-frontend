/**
 * A small red count: on a tab, or beside a section title. Nothing at zero,
 * 99+ past 99. The sm badge sits on a control, so it wears a navy edge to
 * cut it out of what is behind it; that control says the count in its own
 * accessibility label too.
 */
import { StyleSheet, View } from 'react-native';
import { PidroBevel, PidroColors, PidroRadii } from '@/design/tokens';
import { countBadgeText } from '@/features/countBadge';
import { PidroText } from './PidroText';

export interface CountBadgeProps {
  count: number;
  size?: 'md' | 'sm';
}

export function CountBadge({ count, size = 'md' }: CountBadgeProps) {
  const text = countBadgeText(count);
  if (!text) return null;
  const sm = size === 'sm';
  return (
    <View pointerEvents="none" style={[styles.badge, sm ? styles.sm : styles.md]}>
      <PidroText
        maxFontSizeMultiplier={1.2}
        style={[styles.text, sm ? styles.smText : styles.mdText]}>
        {text}
      </PidroText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.countBadge,
  },
  md: { minWidth: 20, height: 20, paddingHorizontal: 6 },
  sm: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: PidroBevel.panelDeep,
  },
  text: {
    color: PidroColors.text,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
  },
  mdText: { fontSize: 11, lineHeight: 14 },
  smText: { fontSize: 10, lineHeight: 12 },
});
