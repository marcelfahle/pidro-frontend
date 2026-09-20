import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroRadii } from '@/design/tokens';

/**
 * A cyan pill pinned to the corner of one CTA ("FIND A TABLE" on PLAY).
 *
 * It wraps the control rather than sitting beside it, because the badge must
 * anchor to the *capped* control — a `fullWidth` BevelButton caps at 380 and
 * centers, so a badge anchored to a wider wrapper drifts away from the button
 * it labels. Wrapping is what keeps the two glued together at every width.
 *
 * One badge per screen, on the hero. The badge is decoration, never a control.
 */
export interface CtaBadgeProps {
  label: string;
  /** Matches the hero's own cap so the badge hugs the button, not the column. */
  maxWidth?: number;
  children: ReactNode;
}

export function CtaBadge({ label, maxWidth = 340, children }: CtaBadgeProps) {
  return (
    <View style={[styles.wrap, { maxWidth }]}>
      {children}
      <View style={styles.badge} pointerEvents="none">
        <PidroText style={styles.label}>{label}</PidroText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
  },
  badge: {
    position: 'absolute',
    top: -9,
    right: 6,
    borderRadius: PidroRadii.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: PidroColors.cyan,
    boxShadow: '0px 2px 6px rgba(0,0,0,0.4)',
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: PidroColors.ink,
  },
});
